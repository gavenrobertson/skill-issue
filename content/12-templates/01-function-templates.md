---
title: Function Templates
summary: Write one function that works for many types, and let the compiler generate each version for you.
---

## The problem: the same function, again and again

Suppose you want a function that returns the larger of two values. With what you know so far, you
need one overload per type:

```cpp
int larger(int a, int b)                         { return a > b ? a : b; }
double larger(double a, double b)                { return a > b ? a : b; }
std::string larger(std::string a, std::string b) { return a > b ? a : b; }
// ... and again for long, char, float, your own types ...
```

The bodies are identical. Only the type changes. Copy-pasting code like this is boring, and worse:
fix a bug in one copy and you have to remember to fix it in all the others.

A **function template** is a *recipe* for making functions. You write the body once, with a
placeholder for the type, and the compiler stamps out a real function for every type you use it with.

## Your first template

```cpp run
#include <iostream>
#include <string>

template <typename T>
T larger(T a, T b) {
    return a > b ? a : b;
}

int main() {
    std::cout << larger(3, 7) << '\n';                 // T = int
    std::cout << larger(2.5, 1.5) << '\n';             // T = double
    std::cout << larger('a', 'z') << '\n';             // T = char
    std::string s1 = "apple", s2 = "banana";
    std::cout << larger(s1, s2) << '\n';               // T = std::string
}
```

```output
7
2.5
z
banana
```

Reading the first line piece by piece:

- `template` says "what follows is a template, not an ordinary function".
- `<typename T>` is the **template parameter list**. `T` is a **type parameter**: a name that stands for
  "some type, to be decided later". `T` is just a convention; `Type`, `Elem` or `Value` work too.
- After that comes a normal function, written in terms of `T`.

### `typename` or `class`?

Inside a template parameter list, `typename` and `class` mean **exactly the same thing**:

```cpp
template <typename T> T larger(T a, T b);   // modern style
template <class T>    T larger(T a, T b);   // older style, identical meaning
```

`class` here does *not* mean "T must be a class": `larger<int>` works fine either way. Many people use
`typename` because it says what it means. You'll see both in real code, including the standard library.

## Instantiation: templates are not code (yet)

A template by itself produces **no machine code**. When the compiler sees `larger(3, 7)`, it works out
that `T` is `int`, then writes this function for you behind the scenes:

```cpp
int larger(int a, int b) { return a > b ? a : b; }   // generated: larger<int>
```

This is called **instantiation**, and the generated function is a **specialization** named
`larger<int>`. Call it with doubles and you get a separate `larger<double>`. Each instantiation is a
completely ordinary function, as fast as if you had written it by hand. Templates cost compile time,
not run time.

One consequence: the body is only fully checked when it's instantiated. If you use the template with a
type that doesn't support what the body does, you get an error *at that point*:

```cpp compile-error
#include <iostream>

struct Point { int x, y; };

template <typename T>
T larger(T a, T b) {
    return a > b ? a : b;      // needs operator> for T
}

int main() {
    Point p{1, 2}, q{3, 4};
    larger(p, q);   // error: no match for 'operator>' (operand types are 'Point' and 'Point')
}
```

The error mentions "required from here" and points at the call. Template errors can get long; read the
**first** `error:` line and the "required from" lines that lead back to *your* code. The
concepts lesson at the end of this module shows how C++20 makes these messages much friendlier.

## Template argument deduction

You almost never write the type yourself. The compiler **deduces** `T` from the arguments. For
`larger(T a, T b)` both arguments must deduce the *same* `T`:

```cpp compile-error
template <typename T>
T larger(T a, T b) { return a > b ? a : b; }

int main() {
    larger(1, 2.5);   // error: deduced conflicting types for parameter 'T' ('int' and 'double')
}
```

Deduction does **not** perform the usual conversions (like `int` to `double`). Each argument is looked at
separately, `1` says "int", `2.5` says "double", and the compiler refuses to guess.

### Explicit template arguments

You can fix it by naming the type yourself in angle brackets after the function name. Now no deduction
happens for `T`, and normal conversions apply to the arguments:

```cpp run
#include <iostream>

template <typename T>
T larger(T a, T b) { return a > b ? a : b; }

int main() {
    std::cout << larger<double>(1, 2.5) << '\n';   // 1 converts to 1.0
    std::cout << larger<int>(7, 3.9) << '\n';      // 3.9 converts to 3 (truncated)
    std::cout << larger<char>(65, 66) << '\n';     // 'A' vs 'B'
}
```

```output
2.5
7
B
```

Some templates *need* explicit arguments because there is nothing to deduce from, for example when the
type only appears in the return type:

```cpp run
#include <iostream>

template <typename T>
T fromInt(int x) {
    return static_cast<T>(x) / 2;
}

int main() {
    std::cout << fromInt<int>(5) << '\n';      // 5 / 2 = 2
    std::cout << fromInt<double>(5) << '\n';   // 5.0 / 2 = 2.5
}
```

```output
2
2.5
```

### Deduction and references, `const`

With a by-value parameter `T a`, top-level `const` and references on the argument are dropped: passing a
`const int` deduces `T = int`. If you take `const T& a`, `T` is deduced without the `const&`, which is
the usual way to avoid copying big objects:

```cpp
template <typename T>
void show(const T& value) {      // no copies, works for any T
    std::cout << value << '\n';
}
```

## Multiple type parameters

A template can have several parameters, separated by commas. Here `a` and `b` may have different types:

```cpp run
#include <iostream>

template <typename A, typename B>
auto add(A a, B b) {
    return a + b;     // return type deduced from the expression
}

template <typename T, typename U>
void printBoth(const T& t, const U& u) {
    std::cout << t << " & " << u << '\n';
}

int main() {
    std::cout << add(1, 2.5) << '\n';     // A = int, B = double, returns double
    std::cout << add(10, 'A') << '\n';    // int + char promotes to int: 75
    printBoth(42, "hello");
    printBoth(3.5, 'x');
}
```

```output
3.5
75
42 & hello
3.5 & x
```

`auto` as the return type lets the compiler figure out what `a + b` produces. You can also name some
parameters explicitly and let the rest be deduced. Explicit arguments fill parameters **left to right**:

```cpp
template <typename To, typename From>
To convert(From f) { return static_cast<To>(f); }

convert<int>(3.7);   // To = int (explicit), From = double (deduced) -> 3
```

That's why parameters that can't be deduced are usually put first.

## Abbreviated function templates (C++20): `auto` parameters

C++20 lets you write `auto` as a parameter type. Every `auto` parameter quietly becomes its own template
parameter:

```cpp run
#include <iostream>
#include <string>

// Exactly the same as: template <typename T, typename U> void printPair(const T& a, const U& b)
void printPair(const auto& a, const auto& b) {
    std::cout << '(' << a << ", " << b << ")\n";
}

auto twice(auto x) {
    return x + x;
}

int main() {
    printPair(1, 2);
    printPair(std::string("pi"), 3.14);
    std::cout << twice(21) << ' ' << twice(1.25) << ' ' << twice(std::string("ab")) << '\n';
}
```

```output
(1, 2)
(pi, 3.14)
42 2.5 abab
```

Note that each `auto` is **independent**: `printPair(const auto& a, const auto& b)` accepts two
*different* types, unlike `larger(T a, T b)`. When you need two parameters to share a type, or you need
to name the type inside the body, use the full `template <typename T>` syntax.

## Templates and ordinary overloads together

A template and a normal function with the same name can coexist. If both match equally well, the
**non-template wins**. You can still force the template with empty angle brackets:

```cpp run
#include <iostream>

template <typename T>
void which(T) { std::cout << "template\n"; }

void which(int) { std::cout << "plain int overload\n"; }

int main() {
    which(5);       // exact match for both: plain function preferred
    which(5.0);     // only the template matches exactly
    which<>(5);     // <> means "use a template"
}
```

```output
plain int overload
template
template
```

## Templates live in headers

For a normal function, the declaration goes in a header and the definition in a `.cpp` file. Templates
don't work that way. To instantiate `larger<double>`, the compiler needs to see the **whole body** in the
file where it's used. So templates are defined entirely in header files:

```cpp
// larger.h
#pragma once

template <typename T>
T larger(T a, T b) {           // full definition in the header
    return a > b ? a : b;
}
```

If you put only the declaration in the header and the body in `larger.cpp`, every file that calls it
compiles fine but you get `undefined reference to 'int larger<int>(int, int)'` at **link time**,
because no file ever instantiated that version. This is why most of the standard library is
header-only templates. (Templates are implicitly allowed to be defined in many files; you don't need
`inline` for them.)

## Common mistakes

- **Conflicting deduction**: `larger(1, 2.5)` fails. Use `larger<double>(1, 2.5)` or make both
  arguments the same type.
- **Using an operation the type lacks**: the error appears at instantiation, pointing into the template body.
- **Forgetting the `template` line** and then using `T`: `error: 'T' was not declared in this scope`.
- **Template body in a `.cpp` file**: link errors. Put it in the header.
- **Returning `T` when the result type differs**: `T average(T a, T b)` with `int` truncates. Think about
  what type the result should be.

:::quiz
Given `template <typename T> T larger(T a, T b);`, which calls compile? (select all that apply)

- [x] `larger(3, 4)`
- [ ] `larger(3, 4.0)`
- [x] `larger<double>(3, 4.0)`
- [x] `larger('a', 'b')`

`larger(3, 4.0)` deduces `T = int` from one argument and `T = double` from the other, which is a
conflict. Naming the type explicitly turns off deduction, so `3` converts to `double`.
:::

:::quiz
What is the difference between `template <typename T>` and `template <class T>`?

- [ ] `class` requires `T` to be a class type
- [ ] `typename` is only allowed since C++20
- [x] None, they are interchangeable here
- [ ] `class` templates can't be used with `int`

In a template parameter list the two keywords are synonyms. `class` is older; `typename` reads better.
:::

:::quiz
You declare a template in `util.h` and define its body in `util.cpp`. `main.cpp` includes `util.h` and calls it. What happens?

- [ ] It works normally
- [ ] Compile error in `main.cpp`
- [x] Link error: undefined reference to the instantiated function
- [ ] Runtime crash

`main.cpp` compiles (the declaration is visible), but no translation unit instantiates the body for that
type, so the linker can't find it. Define templates in headers.
:::

:::exercise Generic maximum
Write a function template `myMax` that takes two values of the same type `T` and returns the larger
one. Use it for three different types.

**Input:** one line with two integers, one line with two decimal numbers, one line with two words.
**Output:** three lines: the larger integer, the larger decimal, and the larger word
(alphabetically later, as compared by `std::string`'s `>`).

```cpp starter
#include <iostream>
#include <string>

// write template <typename T> T myMax(T a, T b) here

int main() {
    int a, b;
    double x, y;
    std::string s, t;
    std::cin >> a >> b >> x >> y >> s >> t;
    // print myMax(a, b), myMax(x, y), myMax(s, t), one per line
}
```

```cpp solution
#include <iostream>
#include <string>

template <typename T>
T myMax(T a, T b) {
    return a > b ? a : b;
}

int main() {
    int a, b;
    double x, y;
    std::string s, t;
    std::cin >> a >> b >> x >> y >> s >> t;
    std::cout << myMax(a, b) << '\n';
    std::cout << myMax(x, y) << '\n';
    std::cout << myMax(s, t) << '\n';
}
```

```hint
The body is the same as for `int`: `return a > b ? a : b;`. Just replace `int` with `T` and put
`template <typename T>` on the line above.
```

```stdin
3 9
2.5 -1.5
pear apple
```

```expected
9
2.5
pear
```

```stdin
-4 -4
0.1 0.25
Zebra zebra
```

```expected hidden
-4
0.25
zebra
```

```checks
must template\s*<\s*(typename|class)\s+\w+\s*> :: Define myMax as a function template.
must myMax\s*\( :: Call your myMax template.
```
:::

:::exercise Swap anything
Write a function template `mySwap(T& a, T& b)` that exchanges two values (don't use `std::swap`).

**Input:** two integers on the first line, two words on the second line.
**Output:** the integers swapped, separated by a space, then the words swapped, separated by a space.

```cpp starter
#include <iostream>
#include <string>

// write mySwap here

int main() {
    int a, b;
    std::string s, t;
    std::cin >> a >> b >> s >> t;
    // swap a/b and s/t with mySwap
    std::cout << a << ' ' << b << '\n';
    std::cout << s << ' ' << t << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

template <typename T>
void mySwap(T& a, T& b) {
    T tmp = a;
    a = b;
    b = tmp;
}

int main() {
    int a, b;
    std::string s, t;
    std::cin >> a >> b >> s >> t;
    mySwap(a, b);
    mySwap(s, t);
    std::cout << a << ' ' << b << '\n';
    std::cout << s << ' ' << t << '\n';
}
```

```hint
Take the parameters **by reference** (`T&`) or the swap only affects copies. Use a temporary `T tmp = a;`.
```

```stdin
1 2
left right
```

```expected
2 1
right left
```

```stdin
0 -7
same same
```

```expected hidden
-7 0
same same
```

```checks
must template\s*< :: Write mySwap as a template.
mustnot std::swap :: Implement the swap yourself instead of calling std::swap.
```
:::

:::exercise Count matches
Write a function template `countEqual(const std::vector<T>& v, const T& target)` that returns how many
elements of `v` equal `target`. Use it once with integers and once with words.

**Input:** `n`, then `n` integers, then an integer target. Then `m`, then `m` words, then a target word.
**Output:** two lines: the count of the integer target, then the count of the target word.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

int countEqual(const std::vector<int>& v, const int& target) {
    int count = 0;
    for (const int& x : v) {
        if (x == target) ++count;
    }
    return count;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> nums(n);
    for (int& x : nums) std::cin >> x;
    int t;
    std::cin >> t;
    std::cout << countEqual(nums, t) << '\n';
    // now read m words and a target word, and count it the same way
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

template <typename T>
int countEqual(const std::vector<T>& v, const T& target) {
    int count = 0;
    for (const T& x : v) {
        if (x == target) ++count;
    }
    return count;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> nums(n);
    for (int& x : nums) std::cin >> x;
    int t;
    std::cin >> t;
    std::cout << countEqual(nums, t) << '\n';

    int m;
    std::cin >> m;
    std::vector<std::string> words(m);
    for (std::string& w : words) std::cin >> w;
    std::string target;
    std::cin >> target;
    std::cout << countEqual(words, target) << '\n';
}
```

```hint
Turn the existing function into a template: add `template <typename T>` and replace every `int` that
means "element type" with `T`. The return type stays `int` (it's a count).
```

```hint
Both `T`s must deduce to the same type: `std::vector<std::string>` gives `T = std::string`, so pass a
`std::string` as the target (not a string literal, which is a `const char*`).
```

```stdin
6
1 2 3 2 2 5
2
4
to be or to
to
```

```expected
3
2
```

```stdin
0
7
3
a b c
z
```

```expected hidden
0
0
```

```checks
must template\s*< :: Make countEqual a template.
mustnot countEqual\s*\(\s*const\s+std::vector\s*<\s*int :: The template should work on std::vector<T>, not just std::vector<int>.
```
:::

:::exercise Print a pair of anything
Write `printPair` as an **abbreviated function template** (C++20 `auto` parameters) that prints its two
arguments as `(first, second)`.

**Input:** an integer and a word on the first line; a decimal number and a character on the second.
**Output:** `(int, word)` on one line and `(decimal, char)` on the next, exactly in that format with a
comma and a space.

```cpp starter
#include <iostream>
#include <string>

void printPair(int a, const std::string& b) {
    std::cout << a << ", " << b << '\n';
}

int main() {
    int i;
    std::string w;
    double d;
    char c;
    std::cin >> i >> w >> d >> c;
    printPair(i, w);
    // printPair(d, c);
}
```

```cpp solution
#include <iostream>
#include <string>

void printPair(const auto& a, const auto& b) {
    std::cout << '(' << a << ", " << b << ")\n";
}

int main() {
    int i;
    std::string w;
    double d;
    char c;
    std::cin >> i >> w >> d >> c;
    printPair(i, w);
    printPair(d, c);
}
```

```hint
Write the parameters as `const auto& a, const auto& b`. Each `auto` becomes its own template parameter,
so the two arguments can be different types.
```

```stdin
3 hello
2.5 x
```

```expected
(3, hello)
(2.5, x)
```

```stdin
-1 a
0 Z
```

```expected hidden
(-1, a)
(0, Z)
```

```checks
must printPair\s*\(\s*(const\s+)?auto :: Use auto parameters (an abbreviated function template).
mustnot template\s*< :: Use the abbreviated auto syntax instead of writing template <...>.
```
:::
