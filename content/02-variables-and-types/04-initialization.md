---
title: Initialization
summary: Every way to give a variable its first value (default, copy, direct, brace, copy-list, value), narrowing, the most vexing parse, and which form to prefer.
---

**Initialization** gives a variable its value at the moment it's created. C++ has accumulated several
syntaxes for it over the decades, and you'll see all of them in real code. They differ in small but
important ways.

## The forms at a glance

```cpp
int a;          // default-initialization: NO value for a local int (garbage!)
int b = 5;      // copy-initialization
int c(5);       // direct-initialization
int d{5};       // direct-list-initialization ("brace init", "uniform init")
int e = {5};    // copy-list-initialization
int f{};        // value-initialization: zero
int g = {};     // also value-initialization: zero
```

```cpp run
#include <iostream>

int main() {
    int b = 5;
    int c(5);
    int d{5};
    int e = {5};
    int f{};
    int g = {};
    std::cout << b << ' ' << c << ' ' << d << ' ' << e << ' ' << f << ' ' << g << '\n';
}
```

```output
5 5 5 5 0 0
```

For a simple `int`, most of these end up doing the same thing. The differences show up with
conversions, with class types, and with the empty-parentheses trap. Let's go one by one.

## Default-initialization: `int x;`

No initializer at all. What you get depends on **where** the variable lives:

- A **local** variable of a fundamental type (`int`, `double`, `char`, `bool`, pointers, ...) gets an
  **indeterminate value**: whatever garbage was already in that memory. **Reading it is undefined
  behavior.**
- A **global** (or `static`) variable is **zero-initialized** first, so it's `0`.
- Class types (like `std::string`) run their default constructor: an empty string is a perfectly good value.

```cpp
int main() {
    int count;            // garbage
    std::cout << count;   // UNDEFINED BEHAVIOR: might print 0, 21845, -1094795586, anything
}
```

GCC can warn about this (`'count' is used uninitialized` / `may be used uninitialized`), but it
doesn't catch every case. Don't rely on the warning; just always initialize.

```cpp run
#include <iostream>
#include <string>

int globalCounter;           // global: zero-initialized, so 0

int main() {
    std::string name;        // class type: default constructor makes an empty string
    std::cout << globalCounter << " [" << name << "]\n";
}
```

```output
0 []
```

## Copy-initialization: `int x = 5;`

The familiar form with `=`. Despite the `=` sign, **this is not an assignment**. It's initialization:
the variable is created with that value. This form allows implicit conversions, including lossy ones:

```cpp run
#include <iostream>

int main() {
    int whole = 3.99;           // double -> int: silently truncated to 3!
    double fraction = 7;        // int -> double: fine, 7.0
    char letter = 65;           // int -> char: 'A'
    std::cout << whole << ' ' << fraction << ' ' << letter << '\n';
}
```

```output
3 7 A
```

Note that GCC with `-Wall -Wextra` said **nothing** about losing `.99`. That is exactly why brace
initialization was invented.

## Direct-initialization: `int x(5);`

Parentheses, no `=`. For fundamental types it behaves like copy-initialization (lossy conversions
allowed). For class types it can call constructors that copy-initialization can't (you'll see this
with `explicit` constructors later). You'll see it often with standard library types:

```cpp run
#include <iostream>
#include <string>

int main() {
    int x(42);
    std::string dashes(10, '-');    // "10 copies of '-'": a constructor with two arguments
    std::cout << x << ' ' << dashes << '\n';
}
```

```output
42 ----------
```

## Brace initialization: `int x{5};`

Introduced in C++11 and called **list-initialization** (or "uniform initialization", because it works
for everything: fundamental types, arrays, structs, containers). Its big advantage: **it rejects
narrowing conversions**, conversions that can lose information.

```cpp compile-error
int main() {
    int a{3.7};          // error: narrowing conversion of '3.7' from 'double' to 'int'
}
```

```cpp compile-error
int main() {
    unsigned int u{-1};  // error: narrowing conversion of '-1' from 'int' to 'unsigned int'
}
```

```cpp compile-error
int main() {
    char c{300};         // error: 300 doesn't fit in a char
}
```

A conversion counts as **narrowing** when it goes:

- from floating point to integer (`double` → `int`),
- from a wider floating type to a narrower one (`double` → `float`),
- from an integer to a type that can't represent all its values (`long long` → `int`, `int` → `unsigned`,
  `int` → `char`, `int` → `double`).

A **constant** whose value actually fits is not narrowing, so `char c{65};` and `float f{0.5};` are fine.

When the source is a **variable** rather than a constant, the C++ standard still says it's an error.
Clang and MSVC reject it; GCC (which this site uses) reports it as a **warning** instead:

```cpp run warns
#include <iostream>

int main() {
    double price = 9.99;
    int dollars{price};     // GCC: warning: narrowing conversion of 'price' from 'double' to 'int'
    std::cout << dollars << '\n';
}
```

```output
9
```

Treat that warning as an error. If you really want the conversion, say so explicitly with
`static_cast<int>(price)` (see **Type Conversions**).

## Copy-list-initialization: `int x = {5};`

Braces with an `=`. For fundamental types it's the same as `int x{5};`, including the narrowing
check. With class types, it can't call `explicit` constructors. You'll mostly see it with containers:

```cpp
int x = {5};
std::vector<int> primes = {2, 3, 5, 7};
```

## Value-initialization: `int x{};`

**Empty braces** mean "initialize to the natural zero value": `0` for numbers, `false` for `bool`,
`'\0'` for `char`, `nullptr` for pointers, and the default constructor for class types.

```cpp run
#include <iostream>

int main() {
    int i{};
    double d{};
    bool b{};
    char c{};
    int* p{};
    int alsoZero = int();     // older spelling: int() is a value-initialized temporary
    std::cout << i << ' ' << d << ' ' << b << ' ' << (c == '\0') << ' ' << (p == nullptr) << ' '
              << alsoZero << '\n';
}
```

```output
0 0 0 1 1 0
```

`int x{};` is the easiest way to say "start at zero" and never have an uninitialized variable.

## The most vexing parse

Here is the trap that makes empty braces so valuable. You might expect `int x();` to mean
"value-initialize x with empty parentheses". It doesn't. **Anything that can be read as a function
declaration is a function declaration.** `int x();` declares a *function* named `x` that takes no
arguments and returns `int`:

```cpp compile-error
int main() {
    int x();      // declares a FUNCTION, not a variable!
    x = 5;        // error: assignment of function 'int x()'
}
```

```cpp compile-error
#include <string>

int main() {
    std::string name();          // also a function declaration
    auto length = name.size();   // error: request for member 'size' in 'name', which is of non-class type
}
```

This is called the **most vexing parse**. GCC even warns: `empty parentheses were disambiguated as a
function declaration`. Fix it with braces, or just leave the parentheses off:

```cpp
int x{};             // a zero int
std::string name{};  // an empty string
std::string name2;   // also an empty string (class types default-construct)
```

## Brace init has one catch: initializer lists

For a class type that has an "initializer list" constructor (like `std::vector`), braces **prefer**
that constructor. That can change the meaning compared to parentheses:

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> a(3, 7);   // parentheses: 3 elements, each 7  -> 7 7 7
    std::vector<int> b{3, 7};   // braces: a list of two elements   -> 3 7
    std::cout << a.size() << ' ' << b.size() << '\n';
}
```

```output
3 2
```

That's the main reason parentheses are still used: to call a specific constructor of a container.

## Which form should I use?

| Situation | Recommended |
| --- | --- |
| Most variables | `int count{0};` or `int count = 0;` |
| Want zero / empty | `int total{};` |
| Want protection from narrowing | braces `{}` |
| Calling a container constructor like "n copies of x" | parentheses `std::vector<int> v(n, x);` |
| With `auto` | `auto x = 5;` (see **auto**) |
| Never | an uninitialized local, or `int x();` |

The C++ Core Guidelines recommend **braces by default** because they work everywhere, catch narrowing,
and avoid the vexing parse. Plain `=` for simple values is also widely used and perfectly fine. What
truly matters is: **always initialize**.

:::quiz
What does this line declare?

```cpp
double value();
```

- [ ] A `double` initialized to `0.0`
- [ ] An uninitialized `double`
- [x] A function named `value` that takes no arguments and returns `double`
- [ ] It doesn't compile

The most vexing parse: anything that can be a function declaration is one. Use `double value{};` for zero.
:::

:::quiz
Which of these lines fail to compile? (select all that apply)

- [x] `int a{2.5};`
- [ ] `int b = 2.5;`
- [ ] `int c(2.5);`
- [x] `int d = {2.5};`
- [ ] `double e{2};`

Brace forms (`{}` and `= {}`) reject narrowing from a `double` to an `int`. The `=` and `()` forms silently
truncate to 2. `double e{2}` is fine: the constant 2 is exactly representable as a `double`.
:::

:::quiz
Inside `main`, what is the value of `n` after `int n;`?

- [ ] `0`
- [ ] `-1`
- [x] Indeterminate: reading it is undefined behavior
- [ ] It doesn't compile

Local variables of fundamental types are not initialized automatically. Only globals and statics are zeroed.
:::

:::exercise Start from zero
Read three integers and print their sum. Your running total must be declared with
**value-initialization** (empty braces, e.g. `int total{};`), then add each number to it.

**Input:** three integers.
**Output:** their sum, newline. For `1 2 3` print `6`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{}, c{};
    std::cin >> a >> b >> c;
    int total;
    // add a, b and c into total, then print it
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{}, c{};
    std::cin >> a >> b >> c;
    int total{};
    total = total + a;
    total = total + b;
    total = total + c;
    std::cout << total << '\n';
}
```

```hint
`int total{};` starts `total` at 0. Then `total = total + a;` and so on.
```

```stdin
1 2 3
```

```expected
6
```

```stdin
-5 5 0
```

```expected hidden
0
```

```stdin
1000000 2000000 -3
```

```expected hidden
2999997
```

```checks
must \btotal\s*\{\s*\} :: Declare total with empty braces: int total{};
```
:::

:::exercise Fix the vexing parse
This program should read an integer and print double its value, but it doesn't compile. The variable
declaration was accidentally written as a function declaration. Fix it.

**Input:** one integer `n`.
**Output:** `2 * n`, newline. For `21` print `42`.

```cpp starter broken
#include <iostream>

int main() {
    int number();
    std::cin >> number;
    std::cout << number * 2 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int number{};
    std::cin >> number;
    std::cout << number * 2 << '\n';
}
```

```hint
`int number();` declares a function named `number`. What does a zero-initialized `int` variable look like?
```

```stdin
21
```

```expected
42
```

```stdin
-8
```

```expected hidden
-16
```

```checks
mustnot \bint\s+number\s*\(\s*\) :: int number(); declares a function. Use braces instead.
must \bnumber\s*\{\s*\} :: Value-initialize number with empty braces.
```
:::

:::exercise Every flavor
Read an integer `n`. Declare five variables, each with a **different** initialization form:

- `a` with copy-initialization from `n` (`int a = n;`)
- `b` with direct-initialization from `n` (`int b(n);`)
- `c` with brace-initialization from `n` (`int c{n};`)
- `d` with copy-list-initialization from `n` (`int d = {n};`)
- `e` with value-initialization (`int e{};`)

**Input:** one integer `n`.
**Output:** the five values separated by single spaces, newline. For `7` print `7 7 7 7 0`.

```cpp starter
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    // declare a, b, c, d and e here

    std::cout << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    int a = n;
    int b(n);
    int c{n};
    int d = {n};
    int e{};
    std::cout << a << ' ' << b << ' ' << c << ' ' << d << ' ' << e << '\n';
}
```

```hint
Write the five declarations exactly as listed, one per line, then print all five with `' '` between them.
```

```stdin
7
```

```expected
7 7 7 7 0
```

```stdin
-3
```

```expected hidden
-3 -3 -3 -3 0
```

```checks
must \bint\s+a\s*=\s*n\s*; :: Copy-initialize a: int a = n;
must \bint\s+b\s*\(\s*n\s*\) :: Direct-initialize b: int b(n);
must \bint\s+c\s*\{\s*n\s*\} :: Brace-initialize c: int c{n};
must \bint\s+d\s*=\s*\{\s*n\s*\} :: Copy-list-initialize d: int d = {n};
must \bint\s+e\s*\{\s*\} :: Value-initialize e: int e{};
```
:::
