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

:::exercise Overloaded describe {easy}
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

```stdin
0 100 abcdefghij
```

```expected hidden
int: 0
double: 100
string: abcdefghij (length 10)
```

```stdin
2147483647 1e10 C++
```

```expected hidden
int: 2147483647
double: 1e+10
string: C++ (length 3)
```

```checks
must void\s+describe\s*\(\s*int\b :: Write a describe(int) overload.
must void\s+describe\s*\(\s*double\b :: Write a describe(double) overload.
must void\s+describe\s*\(\s*const\s+std::string\s*& :: Write a describe(const std::string&) overload.
```
:::

:::exercise Largest of two or three {easy}
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

```stdin
2 -5 -9
```

```expected hidden
-5
```

```stdin
3 1 2 3
```

```expected hidden
3
```

```stdin
3 9 1 1
```

```expected hidden
9
```

```checks
must int\s+largest\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write int largest(int a, int b).
must int\s+largest\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write int largest(int a, int b, int c).
```
:::

:::exercise Fix the ambiguity {medium}
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

```stdin
-7 -3
```

```expected hidden
-3
-1.5
```

```stdin
0 0
```

```expected hidden
0
0
```

```checks
must long\s+half\s*\(\s*long\b :: Add a long half(long x) overload.
mustnot static_cast :: Fix it with an overload, not a cast.
```
:::

:::exercise Biggest of each kind {hard}
Write **four** overloads of a function named `biggest`:

- `int biggest(int a, int b)`: the larger value.
- `double biggest(double a, double b)`: the larger value.
- `std::string biggest(const std::string& a, const std::string& b)`: the **longer** string; if both have
  the same length, the one that comes first alphabetically (`a < b` compares strings alphabetically).
- `int biggest(int a, int b, int c)`: the largest of three, implemented by calling the two-argument
  `int` version.

**Input:** lines until the end of input. Each line starts with a kind word and is followed by the
values: `int a b`, `double a b`, `word a b`, or `int3 a b c`.
**Output:** for each line, the result of calling the matching overload (doubles with default
`std::cout` formatting). For an unknown kind, print `unknown kind <kind>` and stop reading.

For the input

```
int -3 -8
double 2.5 2.25
word pear fig
word fig kiwi
int3 4 9 1
```

the output is

```
-3
2.5
pear
kiwi
9
```

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string kind;
    while (std::cin >> kind) {
        std::cout << kind << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>

int biggest(int a, int b) {
    return a > b ? a : b;
}

double biggest(double a, double b) {
    return a > b ? a : b;
}

std::string biggest(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) {
        return a.size() > b.size() ? a : b;
    }
    return a < b ? a : b;
}

int biggest(int a, int b, int c) {
    return biggest(biggest(a, b), c);
}

int main() {
    std::string kind;
    while (std::cin >> kind) {
        if (kind == "int") {
            int a = 0, b = 0;
            std::cin >> a >> b;
            std::cout << biggest(a, b) << '\n';
        } else if (kind == "double") {
            double a = 0, b = 0;
            std::cin >> a >> b;
            std::cout << biggest(a, b) << '\n';
        } else if (kind == "word") {
            std::string a, b;
            std::cin >> a >> b;
            std::cout << biggest(a, b) << '\n';
        } else if (kind == "int3") {
            int a = 0, b = 0, c = 0;
            std::cin >> a >> b >> c;
            std::cout << biggest(a, b, c) << '\n';
        } else {
            std::cout << "unknown kind " << kind << '\n';
            break;
        }
    }
}
```

```hint
Read the values into variables of the right type first. The type of the arguments is what makes the
compiler pick the matching overload.
```

```hint
For the strings, compare `a.size()` and `b.size()` first; only when they're equal fall back to `a < b`.
```

```hint
Careful with mixed calls: `biggest(2, 2.5)` would be **ambiguous** (int to double vs double to int).
Make sure both arguments have the same type.
```

```stdin
int -3 -8
double 2.5 2.25
word pear fig
word fig kiwi
int3 4 9 1
```

```expected
-3
2.5
pear
kiwi
9
```

```stdin
int3 -1 -1 -2
word abc abd
word same same
```

```expected hidden
-1
abc
same
```

```stdin
double -0.5 -0.25
double 1e9 999999999.5
int 2147483647 -2147483648
```

```expected hidden
-0.25
1e+09
2147483647
```

```stdin
int 1 2
float 1 2
int 5 6
```

```expected hidden
2
unknown kind float
```

```stdin
int3 1 2 3
int3 3 2 1
int3 2 3 1
```

```expected hidden
3
3
3
```

```checks
must int\s+biggest\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write int biggest(int a, int b).
must double\s+biggest\s*\(\s*double :: Write double biggest(double a, double b).
must std::string\s+biggest\s*\(\s*const\s+std::string\s*& :: Write std::string biggest(const std::string& a, const std::string& b).
must int\s+biggest\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\) :: Write int biggest(int a, int b, int c).
```
:::
