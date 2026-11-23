---
title: Type Traits & if constexpr
summary: Ask questions about types at compile time with <type_traits>, enforce rules with static_assert, branch on types with if constexpr, and see what SFINAE was.
---

## Asking questions about types

Inside a template, `T` could be anything. Often you want to know *what* it is: Is it an integer? A
pointer? The same as some other type? Is it `const`? The header `<type_traits>` provides **type traits**:
small class templates that answer such questions at compile time.

```cpp run
#include <iostream>
#include <string>
#include <type_traits>

int main() {
    std::cout << std::boolalpha;
    std::cout << std::is_integral<int>::value << '\n';          // the original spelling
    std::cout << std::is_integral_v<double> << '\n';            // C++17 shortcut: _v
    std::cout << std::is_floating_point_v<double> << '\n';
    std::cout << std::is_pointer_v<int*> << '\n';
    std::cout << std::is_same_v<int, std::string> << '\n';
}
```

```output
true
false
true
true
false
```

Each trait is a class template with a `static constexpr bool value`. Writing `::value` everywhere is
tedious, so C++17 added a **variable template** for each one with a `_v` suffix:

```cpp
std::is_integral<T>::value   // same as
std::is_integral_v<T>
```

### A tour of common traits

| Trait | True when `T` is... |
| --- | --- |
| `is_integral_v<T>` | `bool`, `char`, `int`, `long`, `unsigned`, ... |
| `is_floating_point_v<T>` | `float`, `double`, `long double` |
| `is_arithmetic_v<T>` | integral or floating point |
| `is_signed_v<T>` / `is_unsigned_v<T>` | a signed / unsigned arithmetic type |
| `is_pointer_v<T>` | a pointer like `int*` |
| `is_reference_v<T>` | `T&` or `T&&` |
| `is_const_v<T>` | `const`-qualified (top level) |
| `is_class_v<T>` | a class or struct (e.g. `std::string`) |
| `is_enum_v<T>` | an enumeration |
| `is_same_v<T, U>` | exactly the same type as `U` |
| `is_base_of_v<Base, T>` | derived from `Base` (or is `Base`) |
| `is_convertible_v<From, To>` | implicitly convertible |
| `is_default_constructible_v<T>`, `is_copy_constructible_v<T>`, ... | supports that operation |

`is_same_v` is strict: `int`, `const int` and `int&` are three different types.

```cpp run
#include <iostream>
#include <type_traits>

int main() {
    std::cout << std::is_same_v<int, int>
              << std::is_same_v<int, const int>
              << std::is_same_v<int, int&>
              << std::is_same_v<int, signed int>     // signed int is just another name for int
              << std::is_same_v<char, signed char>   // but char is its own type
              << '\n';
}
```

```output
10010
```

## Transforming types

A second family of traits takes a type and produces **another type**, exposed as a nested `::type`. C++14
added `_t` aliases for them:

```cpp
std::remove_reference<int&>::type   // int
std::remove_reference_t<int&>       // int (shortcut)
```

| Trait | Result |
| --- | --- |
| `remove_reference_t<T>` | `int&` and `int&&` become `int` |
| `remove_const_t<T>` | `const int` becomes `int` |
| `remove_cvref_t<T>` (C++20) | removes reference, then `const` and `volatile`: `const int&` becomes `int` |
| `add_pointer_t<T>` | `int` becomes `int*` |
| `add_const_t<T>` | `int` becomes `const int` |
| `decay_t<T>` | what happens when passing by value: drops ref/const, arrays become pointers |
| `make_unsigned_t<T>` | `int` becomes `unsigned int` |
| `conditional_t<B, X, Y>` | `X` if `B` is true, otherwise `Y` |
| `common_type_t<T, U>` | the type both convert to: `int` and `double` give `double` |

```cpp run
#include <iostream>
#include <type_traits>

int main() {
    std::cout << std::boolalpha;
    std::cout << std::is_same_v<std::remove_reference_t<int&>, int> << '\n';
    std::cout << std::is_same_v<std::remove_cvref_t<const int&>, int> << '\n';
    std::cout << std::is_same_v<std::add_pointer_t<double>, double*> << '\n';
    std::cout << std::is_same_v<std::decay_t<const char[6]>, const char*> << '\n';
    std::cout << std::is_same_v<std::common_type_t<int, double>, double> << '\n';

    using Small = std::conditional_t<(sizeof(int) >= 4), int, long>;
    Small s = 123;
    std::cout << s << '\n';
}
```

```output
true
true
true
true
true
123
```

You'll mostly use these inside templates, for example `std::remove_cvref_t<T>` to get the "plain"
type when `T` was deduced as a reference.

## `static_assert`: compile-time rules

`static_assert(condition, "message")` checks a condition **at compile time**. If it's false, compilation
stops with your message. Combined with traits, it lets a template state its requirements clearly:

```cpp run
#include <iostream>
#include <type_traits>

template <typename T>
T average(T a, T b) {
    static_assert(std::is_floating_point_v<T>, "average() needs a floating-point type");
    return (a + b) / 2;
}

int main() {
    std::cout << average(1.0, 2.0) << '\n';
    static_assert(sizeof(long long) >= 8);   // the message is optional (C++17)
}
```

```output
1.5
```

Call it with integers and you get your message instead of a silent truncation bug:

```cpp compile-error
#include <type_traits>

template <typename T>
T average(T a, T b) {
    static_assert(std::is_floating_point_v<T>, "average() needs a floating-point type");
    return (a + b) / 2;
}

int main() {
    average(1, 2);   // error: static assertion failed: average() needs a floating-point type
}
```

## `if constexpr`: branching on types

Suppose a function should do one thing for numbers and another for strings. A normal `if` doesn't work,
because **both branches must compile** for every `T`, even the branch that never runs:

```cpp compile-error
#include <iostream>
#include <string>
#include <type_traits>

template <typename T>
std::size_t lengthOf(const T& value) {
    if (std::is_arithmetic_v<T>) {
        return 1;
    } else {
        return value.size();    // error for T = int: request for member 'size' in 'value', which is of non-class type
    }
}

int main() {
    std::cout << lengthOf(42) << '\n';
}
```

C++17's **`if constexpr`** evaluates its condition **at compile time** and throws away the branch that
isn't taken. A discarded branch inside a template isn't instantiated, so it doesn't need to be valid for
that `T`:

```cpp run
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
std::size_t lengthOf(const T& value) {
    if constexpr (std::is_arithmetic_v<T>) {
        return 1;
    } else if constexpr (std::is_pointer_v<T>) {
        return value == nullptr ? 0 : 1;
    } else {
        return value.size();    // only compiled for types where this branch is chosen
    }
}

int main() {
    int x = 5;
    std::cout << lengthOf(42) << ' '
              << lengthOf(&x) << ' '
              << lengthOf(std::string("hello")) << ' '
              << lengthOf(std::vector<int>{1, 2, 3}) << '\n';
}
```

```output
1 1 5 3
```

Things to know about `if constexpr`:

- The condition must be a **constant expression** (traits, `sizeof`, template parameters, `constexpr` variables).
- Discarding only works inside a template, for code that depends on the template parameter. Outside a
  template, both branches are still checked.
- It's great with variadic templates: `if constexpr (sizeof...(rest) > 0) print(rest...);` stops the
  recursion without a separate base-case overload.
- A function can **return different types** from different `if constexpr` branches when its return type is
  `auto`, because only one branch survives.

```cpp run
#include <iostream>
#include <string>

template <typename T, typename... Rest>
void printAll(const T& first, const Rest&... rest) {
    std::cout << first;
    if constexpr (sizeof...(rest) > 0) {
        std::cout << " | ";
        printAll(rest...);          // never instantiated with zero arguments
    } else {
        std::cout << '\n';
    }
}

template <typename T>
auto doubled(const T& value) {
    if constexpr (std::is_same_v<T, std::string>) return value + value;   // returns std::string
    else return value * 2;                                                // returns T
}

int main() {
    printAll(1, "two", 3.0);
    std::cout << doubled(21) << ' ' << doubled(std::string("ab")) << '\n';
}
```

```output
1 | two | 3
42 abab
```

## SFINAE (the old way, briefly)

Before concepts, the way to *enable or disable* a whole overload depending on the type was **SFINAE**:
"Substitution Failure Is Not An Error". When the compiler substitutes `T` into a template's signature and
the result is invalid, it doesn't report an error; it just removes that template from the candidate set.
`std::enable_if_t<condition, Type>` is a trait that is invalid when the condition is false, which exploits
this rule:

```cpp run
#include <iostream>
#include <type_traits>

// Only exists for integral T: for others, enable_if_t has no type, so this overload disappears
template <typename T>
std::enable_if_t<std::is_integral_v<T>, const char*> kind(T) { return "integer"; }

template <typename T>
std::enable_if_t<std::is_floating_point_v<T>, const char*> kind(T) { return "floating"; }

int main() {
    std::cout << kind(5) << ' ' << kind(2.5) << '\n';
}
```

```output
integer floating
```

It works, but it's cryptic, and the error messages when nothing matches are awful. You'll still meet
`enable_if` in older code and libraries. In C++20, **concepts** (next lesson) replace almost all of it
with readable syntax: `template <std::integral T>`.

## Common mistakes

- **Using `if` instead of `if constexpr`** when a branch only compiles for some types.
- **Forgetting `_v`/`_t`**: `std::is_integral<T>` is a *type*; in a condition you need
  `std::is_integral_v<T>` (or `::value`).
- **`is_same_v<T, int>` when `T` is deduced as `const int&`**: strip it with `std::remove_cvref_t<T>` first.
- **`static_assert(false, "...")` in a discarded branch**: older compilers reject this even when the
  branch is discarded (the rule was relaxed around C++23). The portable way is a condition that depends
  on `T`, such as `static_assert(sizeof(T) == 0, "...")`.

:::quiz
Which of these are `true`? (select all that apply)

- [x] `std::is_same_v<std::remove_reference_t<int&>, int>`
- [ ] `std::is_same_v<const int, int>`
- [x] `std::is_integral_v<bool>`
- [ ] `std::is_floating_point_v<int>`

Removing the reference from `int&` gives `int`. `const int` and `int` are distinct types. `bool` counts
as an integral type.
:::

:::quiz
Why does the version with plain `if` fail to compile for `T = int` while `if constexpr` works?

- [ ] Plain `if` is evaluated at compile time too, but more slowly
- [x] With plain `if`, both branches are instantiated and must be valid for `T`
- [ ] `if constexpr` turns compile errors into runtime errors
- [ ] Plain `if` cannot be used inside templates

A normal `if` chooses at run time, so the compiler must generate code for both branches. `if constexpr`
discards the untaken branch during instantiation.
:::

:::exercise Classify the type {easy}
Write a function template `kind(const T& value)` that returns `"integer"` if `T` is an integral type,
`"floating"` if it's a floating-point type, and `"other"` otherwise. Use `if constexpr` with type traits.

**Input:** an integer, a decimal number and a word.
**Output:** three lines of the form `<value> is <kind>`.

```cpp starter
#include <iostream>
#include <string>
#include <type_traits>

template <typename T>
std::string kind(const T&) {
    return "other";
}

int main() {
    int i;
    double d;
    std::string w;
    std::cin >> i >> d >> w;
    std::cout << i << " is " << kind(i) << '\n';
    std::cout << d << " is " << kind(d) << '\n';
    std::cout << w << " is " << kind(w) << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <type_traits>

template <typename T>
std::string kind(const T&) {
    if constexpr (std::is_integral_v<T>) {
        return "integer";
    } else if constexpr (std::is_floating_point_v<T>) {
        return "floating";
    } else {
        return "other";
    }
}

int main() {
    int i;
    double d;
    std::string w;
    std::cin >> i >> d >> w;
    std::cout << i << " is " << kind(i) << '\n';
    std::cout << d << " is " << kind(d) << '\n';
    std::cout << w << " is " << kind(w) << '\n';
}
```

```hint
`if constexpr (std::is_integral_v<T>) { ... } else if constexpr (std::is_floating_point_v<T>) { ... } else { ... }`
```

```stdin
42 3.5 hello
```

```expected
42 is integer
3.5 is floating
hello is other
```

```stdin
-1 0 7
```

```expected hidden
-1 is integer
0 is floating
7 is other
```

```stdin
0 -2.5 x
```

```expected hidden
0 is integer
-2.5 is floating
x is other
```

```checks
must if\s+constexpr :: Use if constexpr.
must is_integral :: Use std::is_integral_v.
must is_floating_point :: Use std::is_floating_point_v.
```
:::

:::exercise Twice as much {medium}
Write a function template `twice(const T& value)` that:

- for arithmetic types returns `value * 2`,
- for `std::string` returns the string repeated twice (`"ab"` becomes `"abab"`),
- for `std::vector<int>` returns a vector with every element doubled.

Use `if constexpr` with `std::is_arithmetic_v` and `std::is_same_v`.

**Input:** an integer, a decimal, a word, then `n` and `n` integers.
**Output:** four lines: `twice` of the integer, the decimal, the word, and the vector (elements separated
by spaces; an empty vector prints an empty line).

```cpp starter
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
T twice(const T& value) {
    return value;
}

int main() {
    int i;
    double d;
    std::string w;
    int n;
    std::cin >> i >> d >> w >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::cout << twice(i) << '\n';
    std::cout << twice(d) << '\n';
    std::cout << twice(w) << '\n';
    for (int x : twice(v)) std::cout << x << ' ';
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
T twice(const T& value) {
    if constexpr (std::is_arithmetic_v<T>) {
        return value * 2;
    } else if constexpr (std::is_same_v<T, std::string>) {
        return value + value;
    } else {
        T result = value;
        for (auto& x : result) x *= 2;
        return result;
    }
}

int main() {
    int i;
    double d;
    std::string w;
    int n;
    std::cin >> i >> d >> w >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::cout << twice(i) << '\n';
    std::cout << twice(d) << '\n';
    std::cout << twice(w) << '\n';
    for (int x : twice(v)) std::cout << x << ' ';
    std::cout << '\n';
}
```

```hint
Three branches: `if constexpr (std::is_arithmetic_v<T>)`, `else if constexpr (std::is_same_v<T, std::string>)`,
and `else` for the vector.
```

```hint
With a plain `if`, `value * 2` would have to compile for `std::string`, and it doesn't. That's why you
need `if constexpr`.
```

```stdin
21 1.25 ab
3 1 2 3
```

```expected
42
2.5
abab
2 4 6
```

```stdin
-4 0 x
0
```

```expected hidden
-8
0
xx

```

```stdin
100000 -0.5 aB
1 -7
```

```expected hidden
200000
-1
aBaB
-14
```

```checks
must if\s+constexpr :: Use if constexpr.
must is_same_v\s*<\s*T\s*,\s*std::string\s*> :: Detect std::string with std::is_same_v<T, std::string>.
must is_arithmetic_v :: Detect numbers with std::is_arithmetic_v.
```
:::

:::exercise Checked average {medium}
Write a function template `average(const std::vector<T>& v)` that returns the average as a `double`.
Inside it, use `static_assert` with `std::is_arithmetic_v<T>` so that calling it with a non-numeric
element type fails to compile with a clear message. Use it for a `std::vector<int>` and a
`std::vector<double>`.

**Input:** `n` and `n` integers, then `m` and `m` decimals.
**Output:** two lines with the averages printed with exactly 2 digits after the decimal point
(use `std::fixed` and `std::setprecision(2)`). If a vector is empty, print `empty` on its line.

```cpp starter
#include <iomanip>
#include <iostream>
#include <type_traits>
#include <vector>

double average(const std::vector<int>& v) {
    int total = 0;
    for (int x : v) total += x;
    return total / static_cast<int>(v.size());
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> a(n);
    for (int& x : a) std::cin >> x;
    std::cout << average(a) << '\n';
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <type_traits>
#include <vector>

template <typename T>
double average(const std::vector<T>& v) {
    static_assert(std::is_arithmetic_v<T>, "average() needs numbers");
    double total = 0;
    for (const T& x : v) total += x;
    return total / static_cast<double>(v.size());
}

template <typename T>
void report(const std::vector<T>& v) {
    if (v.empty()) std::cout << "empty\n";
    else std::cout << average(v) << '\n';
}

int main() {
    std::cout << std::fixed << std::setprecision(2);
    int n;
    std::cin >> n;
    std::vector<int> a(n);
    for (int& x : a) std::cin >> x;
    int m;
    std::cin >> m;
    std::vector<double> b(m);
    for (double& x : b) std::cin >> x;
    report(a);
    report(b);
}
```

```hint
Accumulate into a `double`, not a `T`, so integer averages aren't truncated.
```

```hint
Check for an empty vector **before** dividing by its size.
```

```stdin
3 1 2 4
2 0.5 0.3
```

```expected
2.33
0.40
```

```stdin
0
1 -7.5
```

```expected hidden
empty
-7.50
```

```stdin
2 1 2
0
```

```expected hidden
1.50
empty
```

```stdin
1 -3
3 0.1 0.2 0.3
```

```expected hidden
-3.00
0.20
```

```checks
must static_assert\s*\( :: Use static_assert.
must is_arithmetic_v :: Check std::is_arithmetic_v<T>.
must template\s*< :: Make average a template.
```
:::

:::exercise Checked parsing {hard}
Write **one** function template that parses a text token into any of several types, rejecting
anything that isn't a valid value of that type:

```cpp
template <typename T>
bool parseInto(const std::string& token, T& out);   // true on success
```

The rules depend on `T`, so branch with `if constexpr` and type traits:

- `bool`: the token must be exactly `true` or `false`.
- integer types (`short`, `int`, `unsigned`, `long long`): an optional `-` (allowed **only** if `T`
  is signed) followed by one or more digits, and nothing else (no `+`, no spaces, no decimal point).
  The value must fit in `T`: `40000` is not a valid `short`.
- `double`: a decimal number such as `2.5`, `-0.125` or `1e3`, and the whole token must be used.

Careful: `bool` **is** an integral type, so test for it first.

**Input:** lines `TYPE TOKEN`, where `TYPE` is one of `bool`, `short`, `int`, `unsigned`, `llong`
(meaning `long long`) and `double`.
**Output:** for each line, `ok VALUE` (printed with `<<`, and `true`/`false` for a bool) or `invalid`.

```cpp starter
#include <iostream>
#include <string>
#include <type_traits>

template <typename T>
bool parseInto(const std::string& token, T& out) {
    (void)token;
    (void)out;
    return false;
}

template <typename T>
void report(const std::string& token) {
    T value{};
    if (parseInto(token, value)) std::cout << "ok " << value << '\n';
    else std::cout << "invalid\n";
}

int main() {
    std::string type, token;
    while (std::cin >> type >> token) {
        if (type == "bool") report<bool>(token);
        else if (type == "short") report<short>(token);
        else if (type == "int") report<int>(token);
        else if (type == "unsigned") report<unsigned>(token);
        else if (type == "llong") report<long long>(token);
        else report<double>(token);
    }
}
```

```cpp solution
#include <charconv>
#include <iostream>
#include <string>
#include <system_error>
#include <type_traits>

template <typename T>
bool parseInto(const std::string& token, T& out) {
    const char* first = token.data();
    const char* last = token.data() + token.size();
    if constexpr (std::is_same_v<T, bool>) {           // must come before is_integral_v
        if (token == "true") out = true;
        else if (token == "false") out = false;
        else return false;
        return true;
    } else if constexpr (std::is_integral_v<T>) {
        // from_chars accepts '-' only for signed types, never '+', and reports overflow
        auto [ptr, ec] = std::from_chars(first, last, out);
        return ec == std::errc{} && ptr == last;
    } else if constexpr (std::is_floating_point_v<T>) {
        auto [ptr, ec] = std::from_chars(first, last, out);
        return ec == std::errc{} && ptr == last;
    } else {
        static_assert(sizeof(T) == 0, "parseInto: unsupported type");
        return false;
    }
}

template <typename T>
void report(const std::string& token) {
    T value{};
    if (parseInto(token, value)) {
        std::cout << "ok ";
        if constexpr (std::is_same_v<T, bool>) std::cout << (value ? "true" : "false");
        else std::cout << value;
        std::cout << '\n';
    } else {
        std::cout << "invalid\n";
    }
}

int main() {
    std::string type, token;
    while (std::cin >> type >> token) {
        if (type == "bool") report<bool>(token);
        else if (type == "short") report<short>(token);
        else if (type == "int") report<int>(token);
        else if (type == "unsigned") report<unsigned>(token);
        else if (type == "llong") report<long long>(token);
        else report<double>(token);
    }
}
```

```hint
Structure: `if constexpr (std::is_same_v<T, bool>) { ... } else if constexpr (std::is_integral_v<T>) { ... } else { ... }`.
Each branch only has to compile for the types that reach it.
```

```hint
For integers you can do it by hand: check the characters, then accumulate the value in a wider type
and compare against `std::numeric_limits<T>::min()` / `max()` (from `<limits>`), using
`std::is_signed_v<T>` to decide whether `-` is allowed. Watch out for tokens so long that even the
wider type overflows.
```

```hint
Or let the library do the hard part: `std::from_chars(first, last, value)` from `<charconv>` parses
integers and doubles without exceptions. It returns `{ptr, ec}`: success means `ec == std::errc{}`
and `ptr == last` (the whole token was used). It rejects `+`, rejects `-` for unsigned types, and
reports out-of-range values. It has no overload for `bool`, which is why that branch must be separate.
```

```stdin
int 42
int -17
short 40000
unsigned -5
bool true
bool 1
double 2.5
double 3.5x
```

```expected
ok 42
ok -17
invalid
invalid
ok true
invalid
ok 2.5
invalid
```

```stdin
short -32768
short 32767
short -32769
int +5
int 12a
int -
llong 9223372036854775807
llong 9223372036854775808
llong 99999999999999999999999
unsigned 4294967295
unsigned 4294967296
unsigned 007
unsigned -0
int -0
bool True
bool false
double -1e2
double abc
double -0.125
```

```expected hidden
ok -32768
ok 32767
invalid
invalid
invalid
invalid
ok 9223372036854775807
invalid
invalid
ok 4294967295
invalid
ok 7
invalid
ok 0
invalid
ok false
ok -100
invalid
ok -0.125
```

```stdin
llong -9223372036854775808
unsigned 0
double 1e3
int 2147483648
short 0x10
```

```expected hidden
ok -9223372036854775808
ok 0
ok 1000
invalid
invalid
```

```checks
must if\s+constexpr :: Branch on the type with if constexpr.
must is_same_v\s*<\s*T\s*,\s*bool\s*> :: Detect bool with std::is_same_v<T, bool>.
must is_integral_v|is_signed_v|numeric_limits|from_chars :: Use type traits (or from_chars) for the integer rules.
```
:::
