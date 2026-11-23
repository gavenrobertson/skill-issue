---
title: Rvalue References (Intro)
summary: Lvalues vs rvalues, the && reference, which references bind to what, and what std::move really does.
---

You'll often see `&&` in modern C++ code, and `std::move` everywhere. This lesson gives you the
vocabulary to read them. The full story, **move semantics** (how your own types can be moved
cheaply), comes in the classes module. Here we just lay the foundation.

## Lvalues and rvalues

Every expression in C++ is either an **lvalue** or an **rvalue** (the standard has finer categories,
but these two are what matter day to day).

- An **lvalue** is something with an **identity**: a named object that lives somewhere you can point
  to. You can take its address with `&`. Variables are lvalues. The name comes from "can appear on the
  **l**eft of `=`".
- An **rvalue** is a **temporary** value with no lasting identity: literals like `42`, results of
  arithmetic like `x + 1`, and values returned from functions by value. It's about to disappear at the
  end of the statement.

```cpp
int x = 10;          // x is an lvalue, 10 is an rvalue
int y = x + 1;       // x + 1 is an rvalue (a temporary result)
x = y;               // fine: assign to an lvalue
std::string s = std::to_string(5);   // to_string(5) returns a temporary: an rvalue
```

A quick test: **can you take its address?** If yes, it's an lvalue.

```cpp compile-error
int main() {
    int x = 10;
    int* a = &x;         // OK: x is an lvalue
    int* b = &(x + 1);   // error: lvalue required as unary '&' operand
}
```

```cpp compile-error
int main() {
    int x = 10;
    x + 1 = 5;           // error: lvalue required as left operand of assignment
}
```

Some expressions that look "temporary" are actually lvalues: `*p` (the thing a pointer points to),
`arr[i]`, and a function call that **returns a reference** (`v.front()`, for example). They all refer to
an object that exists somewhere.

## Rvalue references: `&&`

You know `T&`, the **lvalue reference**: it binds to lvalues. C++11 added `T&&`, the **rvalue
reference**, which binds **only to rvalues**:

```cpp run
#include <iostream>

int main() {
    int x = 10;

    int& lref = x;          // lvalue reference to an lvalue
    int&& rref = x + 5;     // rvalue reference to a temporary
    int&& lit = 42;         // rvalue reference to a literal's temporary

    rref += 100;            // the temporary lives on (as long as rref), and it's modifiable
    lref = 1;

    std::cout << x << ' ' << rref << ' ' << lit << '\n';
}
```

```output
1 115 42
```

Like a `const&`, an `&&` extends the lifetime of the temporary it binds to. Unlike a `const&`, it lets
you **modify** it. That's the whole point: a temporary is about to die anyway, so nobody will notice
if you modify it, or **steal its contents**. That's what moving is.

An rvalue reference refuses to bind to an lvalue:

```cpp compile-error
int main() {
    int x = 10;
    int&& r = x;   // error: cannot bind rvalue reference of type 'int&&' to lvalue of type 'int'
}
```

## Binding rules

| Reference type | binds to lvalue (`x`) | binds to rvalue (`5`, `x + 1`) |
| --- | --- | --- |
| `int&` | ✓ | ✗ |
| `const int&` | ✓ | ✓ (extends the temporary's life) |
| `int&&` | ✗ | ✓ (extends the temporary's life) |
| `const int&&` | ✗ | ✓ (rarely useful) |

`const T&` is the "accepts anything" reference. `T&&` is the "only temporaries" reference.

## Overloading on lvalue vs rvalue

The reason `&&` exists: you can write **two overloads** of a function, and the compiler picks the
`&&` one for temporaries. The temporary version is allowed to take shortcuts, like stealing resources
instead of copying them.

```cpp run
#include <iostream>
#include <string>

void store(const std::string& s) {
    std::cout << "copy \"" << s << "\"\n";      // must not touch s: the caller still uses it
}

void store(std::string&& s) {
    std::cout << "steal \"" << s << "\"\n";     // s is a temporary: free to take its contents
}

int main() {
    std::string name = "Ada";

    store(name);                    // lvalue  -> const std::string&
    store("Grace");                 // a temporary std::string is created -> std::string&&
    store(name + " Lovelace");      // result of + is a temporary -> std::string&&
}
```

```output
copy "Ada"
steal "Grace"
steal "Ada Lovelace"
```

This is exactly how `std::vector::push_back` works: it has a `const T&` overload that copies and a
`T&&` overload that moves.

### A named rvalue reference is an lvalue

This trips everybody up once. Inside `void store(std::string&& s)`, the **parameter `s` has a name**, so
the expression `s` is an **lvalue**, even though its type is "rvalue reference". Types and value
categories are separate things:

```cpp compile-error
int main() {
    int&& r = 5;
    int&& r2 = r;    // error: r is a named variable, so the expression r is an lvalue
}
```

So if a function receives an `&&` parameter and wants to pass it on as a temporary again, it has to
say so explicitly. That's what `std::move` is for.

## `std::move` doesn't move anything

`std::move(x)` (from `<utility>`) is badly named. It doesn't move; it's just a **cast**. It turns its
argument into an rvalue (technically, it's `static_cast<T&&>(x)`), which says "I'm done with `x`; you
may steal from it". The actual moving, if any, is done by whoever receives that rvalue and has an
`&&` overload.

```cpp run
#include <iostream>
#include <string>
#include <utility>

void store(const std::string&) { std::cout << "copy\n"; }
void store(std::string&&)      { std::cout << "steal\n"; }

int main() {
    std::string name = "Ada";

    store(name);               // copy
    store(std::move(name));    // steal: std::move turned the lvalue into an rvalue

    int x = 5;
    int&& r = std::move(x);    // OK now: std::move(x) is an rvalue
    r = 6;                     // r still refers to x: nothing was moved
    std::cout << x << '\n';
}
```

```output
copy
steal
6
```

Notice: `std::move(x)` on an `int` changes nothing. A cast never modifies anything by itself.

### What happens to a moved-from object?

When a real move does happen, for example constructing one `std::string` from another, the new string
takes over the old one's heap buffer instead of copying the characters. That's much faster for big
strings and vectors:

```cpp run
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::string big(1000, 'x');               // a string of 1000 'x' characters
    std::string stolen = std::move(big);      // std::string's move constructor runs
    std::cout << stolen.size() << '\n';

    std::vector<std::string> names;
    std::string temp = "Linus";
    names.push_back(temp);                    // copies: temp is still needed
    names.push_back(std::move(temp));         // moves: we promise not to use temp's value again
    names.push_back("Grace");                 // a temporary: moved automatically

    std::cout << names.size() << ' ' << names[0] << ' ' << names[2] << '\n';
}
```

```output
1000
3 Linus Grace
```

After a move, the source (`big`, `temp`) is in a **"valid but unspecified" state**. It's still a real
object you can destroy, assign a new value to, or call `.clear()` on, but don't rely on its *value*
(in practice a moved-from `std::string` is usually empty, but the standard doesn't promise that).

```cpp
std::string a = "hello";
std::string b = std::move(a);
std::cout << a;        // legal but meaningless: a's value is unspecified
a = "reused";          // fine: give it a new value and keep using it
```

> **Pitfall:** `std::move` on a `const` object silently **copies**: a `const std::string&&` can't bind
> to the `std::string&&` overload (stealing would modify a const object), so the `const std::string&`
> overload is chosen instead.

> **Pitfall:** Don't write `return std::move(local);`. Returning a local by value already moves it (or
> skips the copy entirely), and the explicit `std::move` can prevent that optimization. GCC warns about
> it with `-Wpessimizing-move`.

## A peek ahead: `auto&&` and `T&&` in templates

When `&&` is attached to a **deduced** type, as in `auto&& x = ...;` or a template parameter `T&&`,
it's not an rvalue reference but a **forwarding reference** that can bind to anything. That's a topic
for the templates module; for now just know that `&&` next to `auto` or a template `T` follows
different rules.

:::quiz
Which of these expressions are rvalues? (select all that apply)

- [ ] `x` (an `int` variable)
- [x] `x + 1`
- [x] `42`
- [ ] `arr[2]`
- [x] `std::move(x)`

Variables and array elements are lvalues: they name objects with addresses. Arithmetic results,
literals, and `std::move(x)` are rvalues.
:::

:::quiz
What does `std::move(x)` do by itself?

- [ ] Copies `x` to a new location
- [ ] Empties `x`
- [x] Casts `x` to an rvalue so that a move overload can be chosen
- [ ] Moves `x` from the stack to the heap

`std::move` is only a cast. Any actual moving is done by the function or constructor that receives the
resulting rvalue.
:::

:::quiz
Given `int x = 1;`, which declarations compile? (select all that apply)

- [ ] `int&& a = x;`
- [x] `int&& b = x * 2;`
- [x] `const int& c = 7;`
- [x] `int&& d = std::move(x);`
- [ ] `int& e = 7;`

`&&` binds only to rvalues (`x * 2`, `std::move(x)`), and `const&` binds to anything. A plain `int&`
can't bind to the literal 7.
:::

:::exercise Lvalue or rvalue? {easy}
Write two overloads:

- `void describe(int& v)` prints `lvalue <v>`
- `void describe(int&& v)` prints `rvalue <v>`

In `main`, read `x` and make exactly these four calls in this order:
`describe(x)`, `describe(x * 2)`, `describe(std::move(x))`, `describe(42)`.

**Input:** one integer `x`.
**Output:** four lines, for example for `x = 5`:

```
lvalue 5
rvalue 10
rvalue 5
rvalue 42
```

```cpp starter
#include <iostream>
#include <utility>

void describe(const int& v) {
    std::cout << "lvalue " << v << '\n';
}

int main() {
    int x;
    std::cin >> x;
    describe(x);
    describe(x * 2);
    describe(std::move(x));
    describe(42);
}
```

```cpp solution
#include <iostream>
#include <utility>

void describe(int& v) {
    std::cout << "lvalue " << v << '\n';
}

void describe(int&& v) {
    std::cout << "rvalue " << v << '\n';
}

int main() {
    int x;
    std::cin >> x;
    describe(x);
    describe(x * 2);
    describe(std::move(x));
    describe(42);
}
```

```hint
The starter's `const int&` accepts everything. Add a second overload taking `int&&`; the compiler
picks it for rvalues.
```

```stdin
5
```

```expected
lvalue 5
rvalue 10
rvalue 5
rvalue 42
```

```stdin
-3
```

```expected
lvalue -3
rvalue -6
rvalue -3
rvalue 42
```

```stdin
0
```

```expected hidden
lvalue 0
rvalue 0
rvalue 0
rvalue 42
```

```checks
must describe\s*\(\s*int\s*&&\s*\w+\s*\) :: Write an overload taking int&&.
must describe\s*\(\s*int\s*&\s*\w+\s*\) :: Write an overload taking int&.
```
:::

:::exercise Fix the bindings {easy}
This program doesn't compile because two references bind to the wrong kind of value. Fix the
**declarations** of `a` and `b` (keep the initializers `x * 2` and `x` as they are): make `a` an
**rvalue reference** and `b` an **lvalue reference**.

**Input:** one integer `x`.
**Output:** `a b c` where `a = 2x`, `b = x`, and `c = x + 1`, separated by spaces, followed by a newline.

```cpp starter broken
#include <iostream>

int main() {
    int x;
    std::cin >> x;

    int& a = x * 2;
    int&& b = x;
    const int& c = x + 1;

    std::cout << a << ' ' << b << ' ' << c << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x;
    std::cin >> x;

    int&& a = x * 2;
    int& b = x;
    const int& c = x + 1;

    std::cout << a << ' ' << b << ' ' << c << '\n';
}
```

```hint
`x * 2` is a temporary (an rvalue), so it needs `int&&` (or `const int&`). `x` is a named variable (an
lvalue), so it needs `int&`.
```

```stdin
5
```

```expected
10 5 6
```

```stdin
-1
```

```expected
-2 -1 0
```

```stdin
0
```

```expected hidden
0 0 1
```

```checks
must int\s*&&\s*a\s*=\s*x\s*\*\s*2 :: Declare a as int&& a = x * 2;
must int\s*&\s*b\s*=\s*x\s*; :: Declare b as int& b = x;
```
:::

:::exercise Move into the vector {easy}
Read words until the input ends. Store each one in a `std::vector<std::string>` by **moving** it in
(`push_back(std::move(word))`), since the variable `word` is overwritten by the next read anyway.

**Input:** zero or more whitespace-separated words.
**Output:** two lines: `<count> words`, then all the words joined with `-` (the second line is empty if
there are no words).

Example: `to be or not` prints `4 words` and then `to-be-or-not`.

```cpp starter
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::string> words;
    std::string word;
    while (std::cin >> word) {
        words.push_back(word);
    }
    std::cout << words.size() << " words\n";
}
```

```cpp solution
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::string> words;
    std::string word;
    while (std::cin >> word) {
        words.push_back(std::move(word));
    }
    std::cout << words.size() << " words\n";
    for (std::size_t i = 0; i < words.size(); ++i) {
        if (i > 0) std::cout << '-';
        std::cout << words[i];
    }
    std::cout << '\n';
}
```

```hint
`words.push_back(std::move(word));` picks the `std::string&&` overload of `push_back`. Reading into
`word` again with `std::cin >> word` gives it a fresh value, so reusing it is fine.
```

```stdin
to be or not
```

```expected
4 words
to-be-or-not
```

```stdin
hello
```

```expected
1 words
hello
```

```stdin

```

```expected hidden
0 words

```

```checks
must push_back\s*\(\s*std::move\s*\(\s*word\s*\)\s*\) :: Move each word in with push_back(std::move(word)).
```
:::

:::exercise Copy or move? {medium}
Write two overloads that append a string to a log, and count how often each one runs:

- `void add(std::vector<std::string>& log, const std::string& s)` **copies** `s` into the log and adds 1
  to a `copies` counter;
- `void add(std::vector<std::string>& log, std::string&& s)` **moves** `s` into the log (with
  `std::move`) and adds 1 to a `moves` counter.

(Use two global `int` counters, or pass them in by reference.) Then read words until the input ends.
For a word with an **even** number of characters, call `add(log, word)`. For a word with an **odd**
number of characters, call `add(log, word + "!")`. Let the compiler pick the overload: don't call
`std::move` in `main`.

**Input:** zero or more words.
**Output:** `copies=<C> moves=<M>`, then the log entries joined with single spaces (an empty line if
there are none).

Example: `to be or not` gives `copies=3 moves=1` and `to be or not!`.

```cpp starter
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::string> log;
    std::string word;
    while (std::cin >> word) {
        log.push_back(word);
    }
    std::cout << "copies=0 moves=0\n";
}
```

```cpp solution
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int copies = 0;
int moves = 0;

void add(std::vector<std::string>& log, const std::string& s) {
    log.push_back(s);                 // s may still be needed by the caller: copy it
    ++copies;
}

void add(std::vector<std::string>& log, std::string&& s) {
    log.push_back(std::move(s));      // s is a named rvalue reference (an lvalue!): std::move it on
    ++moves;
}

int main() {
    std::vector<std::string> log;
    std::string word;
    while (std::cin >> word) {
        if (word.size() % 2 == 0) {
            add(log, word);           // lvalue: the const& overload
        } else {
            add(log, word + "!");     // temporary: the && overload
        }
    }
    std::cout << "copies=" << copies << " moves=" << moves << '\n';
    for (std::size_t i = 0; i < log.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << log[i];
    }
    std::cout << '\n';
}
```

```hint
`word` is a named variable, so `add(log, word)` picks the `const std::string&` overload.
`word + "!"` is a temporary, so `add(log, word + "!")` picks the `std::string&&` one.
```

```hint
Inside the `&&` overload, `s` has a name, so it's an lvalue. `log.push_back(s)` would copy; write
`log.push_back(std::move(s))` to actually move.
```

```stdin
to be or not
```

```expected
copies=3 moves=1
to be or not!
```

```stdin
hello world
```

```expected
copies=0 moves=2
hello! world!
```

```stdin
```

```expected hidden
copies=0 moves=0
```

```stdin
a bb ccc dddd
```

```expected hidden
copies=2 moves=2
a! bb ccc! dddd
```

```checks
must void\s+add\s*\([^)]*const\s+std::string\s*& :: Write the overload taking const std::string&.
must void\s+add\s*\([^)]*std::string\s*&& :: Write the overload taking std::string&&.
must push_back\s*\(\s*std::move\s*\( :: Move the string into the log with push_back(std::move(s)).
mustnot add\s*\([^;{]*std::move :: Let the compiler choose: don't std::move in the calls to add.
```
:::
