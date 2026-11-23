---
title: Function Overloading
summary: Several functions with the same name but different parameters, how the compiler picks one, and the ambiguity errors you'll run into.
---

## Same name, different parameters

In C, every function needs a unique name, so you get `absInt`, `absDouble`, `absLong`... C++ lets
you **overload** a name: define several functions with the same name, as long as their
**parameter lists differ** in the number or types of parameters.

```cpp run
#include <iostream>
#include <string>

int twice(int x) { return x * 2; }
double twice(double x) { return x * 2; }
std::string twice(const std::string& s) { return s + s; }

int area(int side) { return side * side; }                 // a square
int area(int width, int height) { return width * height; } // a rectangle

int main() {
    std::cout << twice(21) << '\n';                 // int version
    std::cout << twice(1.25) << '\n';               // double version
    std::cout << twice(std::string("ab")) << '\n';  // string version
    std::cout << area(4) << ' ' << area(2, 3) << '\n';
}
```

```output
42
2.5
abab
16 6
```

The compiler looks at the **arguments** in each call and picks the best-matching version. This is
called **overload resolution**, and it happens entirely at compile time.

The name plus the parameter types is the function's **signature**. Overloads must have different
signatures. You've been using overloading all along: `std::cout << 5` and `std::cout << "hi"` call
different overloads of `<<`.

## Return type doesn't count

Two functions that differ **only** in return type are not valid overloads. At a call like
`getValue()`, the compiler has nothing to choose with:

```cpp compile-error
int getValue() { return 1; }
double getValue() { return 1.0; }   // error: ambiguating new declaration of 'double getValue()'

int main() {}
```

Parameter **names** don't count either: `void f(int a)` and `void f(int b)` are the same function.
And a top-level `const` on a by-value parameter doesn't count: `void f(int)` and `void f(const int)`
are the same signature, because the caller can't tell the difference (it's a copy either way).

## How the compiler picks: the basics

For each call, the compiler ranks every candidate by how well the arguments convert to the
parameter types. Roughly, from best to worst:

1. **Exact match** (including trivial tweaks like adding `const` or binding a reference).
2. **Promotion**: small integer types to `int` (`char`, `short`, `bool` to `int`), `float` to `double`.
3. **Standard conversion**: `int` to `double`, `double` to `int`, `int` to `long`, and so on.
4. **User-defined conversion**: e.g. a `const char*` string literal to `std::string`.

The overload with the best rank wins. If there's a tie for best, the call is **ambiguous**.

```cpp run
#include <iostream>

void show(int)    { std::cout << "int\n"; }
void show(double) { std::cout << "double\n"; }
void show(char)   { std::cout << "char\n"; }

int main() {
    show(1);      // exact match: int
    show(1.0);    // exact match: double
    show('x');    // exact match: char
    show(2.5f);   // float -> double is a promotion, beats float -> int
    short s = 3;
    show(s);      // short -> int is a promotion, beats short -> double
    show(true);   // bool -> int is a promotion
}
```

```output
int
double
char
double
int
int
```

## Ambiguity errors

When two candidates are equally good, the compiler refuses to guess:

```cpp compile-error
void show(int) {}
void show(double) {}

int main() {
    long n = 5;
    show(n);   // error: call of overloaded 'show(long int&)' is ambiguous
               // long -> int and long -> double are both "standard conversions"
}
```

```cpp compile-error
void show(float) {}
void show(long) {}

int main() {
    show(3.14);   // error: ambiguous. 3.14 is a double; double -> float and double -> long tie
}
```

Fixes: add an overload for the exact type, or convert explicitly at the call:
`show(static_cast<int>(n))`.

Default arguments can also cause ambiguity with overloads:

```cpp compile-error
void beep() {}
void beep(int times = 1) {}

int main() {
    beep();   // error: call of overloaded 'beep()' is ambiguous
}
```

## Value vs `const&` overloads

Overloading `f(T)` with `f(const T&)` is legal to *declare*, but every call with a variable is
ambiguous, because "copy it" and "bind a const reference to it" are both exact matches:

```cpp compile-error
#include <string>

void print(std::string s) {}
void print(const std::string& s) {}

int main() {
    std::string name = "Ada";
    print(name);   // error: ambiguous
}
```

Pick one form per type. On the other hand, overloading on `T&` vs `const T&` **is** useful: the
compiler picks the non-const one for modifiable variables and the const one for constants and
temporaries:

```cpp run
#include <iostream>
#include <string>

void inspect(std::string&)       { std::cout << "modifiable\n"; }
void inspect(const std::string&) { std::cout << "read-only\n"; }

int main() {
    std::string a = "x";
    const std::string b = "y";
    inspect(a);                  // non-const variable: std::string& is the better match
    inspect(b);                  // const variable: only const& fits
    inspect(std::string("z"));   // temporary: only const& can bind
}
```

```output
modifiable
read-only
read-only
```

## A string literal gotcha

A string literal like `"hi"` is not a `std::string`, it's an array of `const char` (you'll see why
in the C strings lesson). Converting it to `bool` is a *standard* conversion, while converting it to
`std::string` is *user-defined*, which ranks lower. So:

```cpp run
#include <iostream>
#include <string>

void note(bool)               { std::cout << "bool\n"; }
void note(const std::string&) { std::cout << "string\n"; }

int main() {
    note("surprise");                // picks bool!
    note(std::string("expected"));   // string
}
```

```output
bool
string
```

If you overload for `std::string`, consider adding a `const char*` overload too.

## When to overload

Overload when the functions do **the same conceptual thing** to different types or with different
amounts of information (`area` of a square or rectangle, `print` for int or string). If they do
different things, give them different names. Later you'll see **templates**, which let you write one
function that works for many types.

:::quiz
Which pair is **not** a valid overload set?

- [ ] `void f(int);` and `void f(double);`
- [ ] `void f(int);` and `void f(int, int);`
- [x] `int f(int);` and `double f(int);`
- [ ] `void f(std::string&);` and `void f(const std::string&);`

Overloads must differ in their parameter lists. Differing only in return type is an error.
:::

:::quiz
Given `void g(int)` and `void g(double)`, what does `g('A')` call?

- [x] `g(int)`, because `char` to `int` is a promotion
- [ ] `g(double)`
- [ ] It's ambiguous

A promotion (char to int) ranks better than a conversion (char to double).
:::

:::exercise Overloaded describe
Write three overloads of `describe`:

- `void describe(int n)` prints `int: N`
- `void describe(double d)` prints `double: D`
- `void describe(const std::string& s)` prints `string: S (length L)`

Each prints one line. The program reads one integer, one floating-point number and one word, and
calls `describe` on each in that order.

**Input:** an integer, a number, and a word.
**Output:** three lines as described. Doubles use default `std::cout` formatting.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int n;
    double d;
    std::string s;
    std::cin >> n >> d >> s;
}
```

```cpp solution
#include <iostream>
#include <string>

void describe(int n) {
    std::cout << "int: " << n << '\n';
}

void describe(double d) {
    std::cout << "double: " << d << '\n';
}

void describe(const std::string& s) {
    std::cout << "string: " << s << " (length " << s.size() << ")\n";
}

int main() {
    int n;
    double d;
    std::string s;
    std::cin >> n >> d >> s;
    describe(n);
    describe(d);
    describe(s);
}
```

```hint
All three functions are named `describe`; only their parameter types differ.
```

```stdin
42 3.5 hello
```

```expected
int: 42
double: 3.5
string: hello (length 5)
```

```stdin
-1 0.25 x
```

```expected hidden
int: -1
double: 0.25
string: x (length 1)
```

```checks
must void\s+describe\s*\(\s*int\b :: Write a describe(int) overload.
must void\s+describe\s*\(\s*double\b :: Write a describe(double) overload.
must void\s+describe\s*\(\s*const\s+std::string\s*& :: Write a describe(const std::string&) overload.
```
:::

:::exercise Largest of two or three
Write two overloads: `int largest(int a, int b)` and `int largest(int a, int b, int c)`. Make the
three-argument version **call** the two-argument one. Read a count `k` (2 or 3) followed by `k`
integers, and print the largest using the matching overload.

**Input:** `k` (2 or 3), then `k` integers.
**Output:** the largest value followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int k;
    std::cin >> k;
}
```

```cpp solution
#include <iostream>

int largest(int a, int b) {
    return (a > b) ? a : b;
}

int largest(int a, int b, int c) {
    return largest(largest(a, b), c);
}

int main() {
    int k;
    std::cin >> k;
    if (k == 2) {
        int a, b;
        std::cin >> a >> b;
        std::cout << largest(a, b) << '\n';
    } else {
        int a, b, c;
        std::cin >> a >> b >> c;
        std::cout << largest(a, b, c) << '\n';
    }
}
```

```hint
The three-argument version can be one line: the largest of `largest(a, b)` and `c`.
```

```stdin
2 4 9
```

```expected
9
```

```stdin
3 -1 -7 -3
```

```expected
-1
```

```stdin
3 5 5 2
```

```expected hidden
5
```

```checks
must int\s+largest\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write int largest(int a, int b).
must int\s+largest\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write int largest(int a, int b, int c).
```
:::

:::exercise Fix the ambiguity
This program doesn't compile: the call `half(n)` with a `long` is ambiguous between `half(int)` and
`half(double)`. Fix it by **adding a third overload** `long half(long x)` that returns `x / 2`. Don't
change `main`.

**Input:** an integer `n` and a number `d`.
**Output:** `half(n)` and `half(d)` on two lines.

```cpp starter broken
#include <iostream>

int half(int x) { return x / 2; }
double half(double x) { return x / 2; }

int main() {
    long n;
    double d;
    std::cin >> n >> d;
    std::cout << half(n) << '\n';
    std::cout << half(d) << '\n';
}
```

```cpp solution
#include <iostream>

int half(int x) { return x / 2; }
double half(double x) { return x / 2; }
long half(long x) { return x / 2; }

int main() {
    long n;
    double d;
    std::cin >> n >> d;
    std::cout << half(n) << '\n';
    std::cout << half(d) << '\n';
}
```

```hint
Read the error: `call of overloaded 'half(long int&)' is ambiguous`. An exact match for `long` wins over both conversions.
```

```stdin
9 5
```

```expected
4
2.5
```

```stdin
-10000000000 0.5
```

```expected hidden
-5000000000
0.25
```

```checks
must long\s+half\s*\(\s*long\b :: Add a long half(long x) overload.
mustnot static_cast :: Fix it with an overload, not a cast.
```
:::
