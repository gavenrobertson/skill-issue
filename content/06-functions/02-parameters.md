---
title: Passing Arguments
summary: Pass by value, by reference, and by const reference; a first look at pointer parameters; how arrays are passed; and how to choose.
---

When you call a function, how does the argument get into the parameter? C++ gives you a choice,
and it matters for both **correctness** (can the function change my variable?) and **speed** (does
it copy a huge object?).

## Pass by value: the function gets a copy

This is the default. The parameter is a brand-new variable, **initialized with a copy** of the
argument. Changing the parameter has no effect on the caller:

```cpp run
#include <iostream>

void addOne(int n) {        // n is a copy
    n = n + 1;
    std::cout << "inside:  " << n << '\n';
}

int main() {
    int score = 5;
    addOne(score);
    std::cout << "outside: " << score << '\n';   // unchanged
}
```

```output
inside:  6
outside: 5
```

Pass by value is simple and safe: the function can't mess up your variables. For small types
(`int`, `double`, `char`, `bool`) copying costs nothing, so **pass small types by value**.

Because the parameter is a copy, any expression works as an argument, including literals and
calculations: `addOne(41)`, `addOne(score * 2)`.

## Pass by reference: the function works on your variable

Put `&` after the parameter's type and the parameter becomes a **reference**: another name for the
caller's variable. No copy is made, and changes go straight through:

```cpp run
#include <iostream>

void addOne(int& n) {       // n IS the caller's variable
    n = n + 1;
}

int main() {
    int score = 5;
    addOne(score);
    addOne(score);
    std::cout << score << '\n';
}
```

```output
7
```

The call looks exactly the same (`addOne(score)`); only the function's signature differs. The `&`
can be written next to the type or the name. All of these mean the same thing:

```cpp
void addOne(int& n);
void addOne(int &n);
void addOne(int & n);
```

The classic use is a function that needs to change **more than one** variable, like swapping:

```cpp run
#include <iostream>

void swapValues(int& a, int& b) {
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int x = 1;
    int y = 2;
    swapValues(x, y);
    std::cout << x << ' ' << y << '\n';
}
```

```output
2 1
```

(The standard library already has `std::swap` in `<utility>` that does this for any type.)

A non-const reference must bind to an actual variable (an **lvalue**). You can't pass a literal or a
temporary, since there's nothing to modify:

```cpp compile-error
void addOne(int& n) { n = n + 1; }

int main() {
    addOne(5);   // error: cannot bind non-const lvalue reference of type 'int&' to an rvalue of type 'int'
}
```

> **Tip:** References used to return extra results ("out parameters") are legal, but returning a
> value is usually clearer. The next lesson shows how to return several values at once.

## Pass by const reference: no copy, no changes

Copying an `int` is free, but copying a `std::string` holding a whole book, or a `std::vector` with a
million elements, is not. A **const reference** (`const T&`) gives you the best of both: no copy,
*and* the function promises not to modify the argument.

```cpp run
#include <iostream>
#include <string>

void printBanner(const std::string& text) {   // no copy made
    std::cout << "*** " << text << " ***\n";
    // text += "!";   // error: text is const
}

int main() {
    std::string title = "Functions";
    printBanner(title);
    printBanner("temporaries are fine too");   // const& can bind to temporaries
}
```

```output
*** Functions ***
*** temporaries are fine too ***
```

Trying to change it is a compile error, which is exactly the point:

```cpp compile-error
#include <string>

void shout(const std::string& text) {
    text += "!";   // error: no match for 'operator+=' (operand types are 'const std::string' and ...)
}

int main() {
    shout("hi");
}
```

Unlike `int&`, a `const int&` (or `const std::string&`) **can** bind to a literal or temporary. The
compiler creates a temporary object for it, which lives until the call finishes.

> **Note:** `const std::string&` and `std::string const&` mean the same thing. This guide puts
> `const` first, which is the more common style.

## Pointer parameters (a preview)

You'll also see parameters with a `*`, like `void addOne(int* p)`. That's a **pointer**: a variable
holding a memory address. The caller passes an address with `&`, and the function reaches the
variable through it with `*`:

```cpp run
#include <iostream>

void addOne(int* p) {
    *p = *p + 1;      // "the int that p points to" gets one bigger
}

int main() {
    int score = 5;
    addOne(&score);   // pass the address of score
    std::cout << score << '\n';
}
```

```output
6
```

This is how C did "pass by reference" before C++ had references. Pointers can be null and need
more care, so in C++ **prefer references** unless "no object" is a valid input. Module 08 covers
pointers properly.

## Passing C arrays: they decay to pointers

A plain C array (covered fully in the next module) can't be passed by value. When you pass one, it
**decays** into a pointer to its first element, and the function loses track of the size. That's
why array functions take the size as a separate parameter:

```cpp run
#include <iostream>

int sum(const int values[], int count) {   // values is really a const int*
    int total = 0;
    for (int i = 0; i < count; ++i) {
        total += values[i];
    }
    return total;
}

void doubleAll(int values[], int count) {  // no const: we modify the caller's array
    for (int i = 0; i < count; ++i) {
        values[i] *= 2;
    }
}

int main() {
    int data[] = {1, 2, 3, 4};
    doubleAll(data, 4);
    std::cout << sum(data, 4) << '\n';
}
```

```output
20
```

Two surprises worth remembering:

- `int values[]` in a parameter list is just another spelling of `int* values`. Writing
  `int values[4]` doesn't change that, and the 4 is ignored.
- Because no copy is made, a function **can modify the caller's array** unless you write `const`.

Better tools (`std::array`, `std::vector`, `std::span`) carry their size with them; you'll meet them
in the next module.

## Which one should I use?

| You want to... | Write | Example |
| --- | --- | --- |
| read a small value (`int`, `double`, `char`, `bool`) | by value `T` | `int square(int x)` |
| read a big object (string, vector, struct) | const reference `const T&` | `void print(const std::string& s)` |
| modify the caller's variable | reference `T&` | `void swapValues(int& a, int& b)` |
| make a modified copy inside anyway | by value `T` | `std::string upper(std::string s)` |
| allow "no object" (null) | pointer `T*` | covered in module 08 |

The fourth row is a nice trick: if the function would copy the argument anyway to work on it, take
it by value and modify the parameter directly.

## Common mistakes

- **Forgetting the `&`.** `void reset(int x) { x = 0; }` compiles fine and silently does nothing to
  the caller. If a function "doesn't work", check whether it needed a reference.
- **Using `T&` where you meant `const T&`.** Then callers can't pass literals or temporaries, and
  readers think the function modifies its argument.
- **Passing big objects by value** out of habit. It works, but copies every call.

:::quiz
What does this print?

```cpp
void triple(int n) { n *= 3; }

int main() {
    int x = 4;
    triple(x);
    std::cout << x;
}
```

- [x] `4`
- [ ] `12`
- [ ] It doesn't compile

`n` is a copy, so `x` is unchanged. To modify `x`, the parameter would need to be `int& n`.
:::

:::quiz
Which signature is the best choice for a function that only **prints** a `std::string`?

- [ ] `void show(std::string s)`
- [ ] `void show(std::string& s)`
- [x] `void show(const std::string& s)`

`const&` avoids the copy and promises not to modify it. A plain `std::string&` would also reject
temporaries like `show("hi")`.
:::

:::quiz
Given `void f(int& r);`, which calls compile? (select all that apply)

- [x] `int a = 1; f(a);`
- [ ] `f(5);`
- [ ] `int a = 1; f(a + 1);`

A non-const reference must bind to a variable. `5` and `a + 1` are temporaries.
:::

:::exercise Make it stick
The function `doubleIt` is supposed to double the caller's variable, but it doesn't work. Fix it by
changing **only the function's parameter**, so it takes its argument by reference.

**Input:** one integer `n`.
**Output:** `2 * n` followed by a newline.

```cpp starter
#include <iostream>

void doubleIt(int value) {
    value = value * 2;
}

int main() {
    int n;
    std::cin >> n;
    doubleIt(n);
    std::cout << n << '\n';
}
```

```cpp solution
#include <iostream>

void doubleIt(int& value) {
    value = value * 2;
}

int main() {
    int n;
    std::cin >> n;
    doubleIt(n);
    std::cout << n << '\n';
}
```

```hint
Add `&` after `int` in the parameter list.
```

```stdin
21
```

```expected
42
```

```stdin
0
```

```expected hidden
0
```

```stdin
-8
```

```expected hidden
-16
```

```checks
must doubleIt\s*\(\s*int\s*&\s*\w+\s*\) :: Take the parameter by reference (int&).
must doubleIt\s*\(\s*n\s*\)\s*; :: Keep the call doubleIt(n); in main.
```
:::

:::exercise Sort three
Write `void sortThree(int& a, int& b, int& c)` that rearranges the three variables so that
`a <= b <= c`. Then read three integers, call it, and print them.

**Input:** three integers.
**Output:** the three integers in ascending order, separated by single spaces, then a newline.

```cpp starter
#include <iostream>

int main() {
    int a, b, c;
    std::cin >> a >> b >> c;
    std::cout << a << ' ' << b << ' ' << c << '\n';
}
```

```cpp solution
#include <iostream>

void swapValues(int& x, int& y) {
    int temp = x;
    x = y;
    y = temp;
}

void sortThree(int& a, int& b, int& c) {
    if (a > b) swapValues(a, b);
    if (b > c) swapValues(b, c);
    if (a > b) swapValues(a, b);
}

int main() {
    int a, b, c;
    std::cin >> a >> b >> c;
    sortThree(a, b, c);
    std::cout << a << ' ' << b << ' ' << c << '\n';
}
```

```hint
Write a small `swapValues(int& x, int& y)` helper first.
```

```hint
Three compare-and-swap steps are enough: (a,b), then (b,c), then (a,b) again.
```

```stdin
3 1 2
```

```expected
1 2 3
```

```stdin
9 9 -1
```

```expected hidden
-1 9 9
```

```stdin
5 4 3
```

```expected hidden
3 4 5
```

```checks
must void\s+sortThree\s*\(\s*int\s*&\s*\w+\s*,\s*int\s*&\s*\w+\s*,\s*int\s*&\s*\w+\s*\) :: Define void sortThree(int& a, int& b, int& c).
must sortThree\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)\s*; :: Call sortThree from main.
```
:::

:::exercise Count vowels
Write `int countVowels(const std::string& text)` that returns how many characters of `text` are
lowercase vowels (`a`, `e`, `i`, `o`, `u`). Read one line of text and print the count.

**Input:** one line of text (may contain spaces, may be empty).
**Output:** the number of lowercase vowels, then a newline.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << 0 << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int countVowels(const std::string& text) {
    int count = 0;
    for (char c : text) {
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
            ++count;
        }
    }
    return count;
}

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << countVowels(line) << '\n';
}
```

```hint
A range-based `for (char c : text)` visits every character.
```

```stdin
hello world
```

```expected
3
```

```stdin
rhythm
```

```expected hidden
0
```

```stdin
a quick brown fox jumps over the lazy dog
```

```expected hidden
11
```

```checks
must int\s+countVowels\s*\(\s*const\s+std::string\s*&\s*\w+\s*\) :: Take the string by const reference: const std::string&.
```
:::
