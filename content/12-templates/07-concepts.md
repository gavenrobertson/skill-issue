---
title: Concepts
summary: C++20 concepts put named requirements on template parameters, giving readable constraints, overloading by capability and far better error messages.
---

## The problem concepts solve

A template like `template <typename T> T gcd(T a, T b)` *silently assumes* things about `T`: that it
supports `%`, can be compared to `0`, and so on. Nothing in the signature says so. Pass the wrong type
and the error comes from deep inside the body, often dozens of lines of text from library internals.

A **concept** is a named, compile-time **requirement on a type**. You attach it to a template parameter,
and the compiler checks it *at the call site*, before even looking at the body:

```cpp run
#include <concepts>
#include <iostream>

template <std::integral T>          // T must be an integral type
T gcd(T a, T b) {
    while (b != 0) {
        T r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    std::cout << gcd(12, 18) << ' ' << gcd(100LL, 75LL) << '\n';
}
```

```output
6 25
```

Call it with doubles and the error says exactly what went wrong:

```cpp compile-error
#include <concepts>

template <std::integral T>
T gcd(T a, T b) {
    while (b != 0) { T r = a % b; a = b; b = r; }
    return a;
}

int main() {
    gcd(1.5, 2.5);
    // error: no matching function for call to 'gcd(double, double)'
    // note: template constraint failure ... the expression 'is_integral_v<_Tp>' evaluated to 'false'
    // note: the required type 'double' does not satisfy 'integral'
}
```

## Four ways to constrain a template

All four of these declare the same thing: "`T` must satisfy `std::integral`".

```cpp
// 1. Constrained template parameter: the concept replaces 'typename'
template <std::integral T>
T twice(T x) { return x * 2; }

// 2. requires clause after the template parameter list
template <typename T>
    requires std::integral<T>
T twice(T x) { return x * 2; }

// 3. Trailing requires clause after the function signature
template <typename T>
T twice(T x) requires std::integral<T> { return x * 2; }

// 4. Abbreviated function template: concept before auto
auto twice(std::integral auto x) { return x * 2; }
```

- Form 1 is the most common for a single requirement.
- Forms 2 and 3 take any **boolean expression** of concepts and traits, combined with `&&`, `||` and `!`:
  `requires std::integral<T> || std::floating_point<T>`.
- Form 4 is the shortest. As with plain `auto` parameters, each `std::integral auto` is its own,
  independent type.

When you use a concept as in form 1 or 4, the type is filled in as the **first** argument automatically.
For a concept with two parameters like `std::convertible_to<From, To>`, writing
`template <std::convertible_to<double> T>` means `std::convertible_to<T, double>`.

```cpp run
#include <concepts>
#include <iostream>
#include <string>

template <typename T>
    requires std::integral<T> || std::floating_point<T>
T square(T x) { return x * x; }

void greet(std::convertible_to<std::string> auto const& name) {
    std::string s = name;          // allowed: name converts to std::string
    std::cout << "Hello, " << s << "!\n";
}

int main() {
    std::cout << square(7) << ' ' << square(1.5) << '\n';
    greet("Ada");
    greet(std::string("Linus"));
}
```

```output
49 2.25
Hello, Ada!
Hello, Linus!
```

## Standard concepts

The header `<concepts>` (plus `<iterator>` and `<ranges>` for iterator and range concepts) defines many
ready-made concepts:

| Concept | Satisfied when |
| --- | --- |
| `std::integral<T>` | `T` is an integral type (`int`, `char`, `bool`, ...) |
| `std::signed_integral<T>` / `std::unsigned_integral<T>` | signed / unsigned integral |
| `std::floating_point<T>` | `float`, `double`, `long double` |
| `std::same_as<T, U>` | `T` and `U` are the same type |
| `std::convertible_to<From, To>` | `From` converts implicitly to `To` |
| `std::derived_from<D, B>` | `D` is derived from `B` |
| `std::equality_comparable<T>` | `==` and `!=` work |
| `std::totally_ordered<T>` | `<`, `>`, `<=`, `>=`, `==`, `!=` all work |
| `std::default_initializable<T>`, `std::copyable<T>`, `std::movable<T>` | supports those operations |
| `std::invocable<F, Args...>` | `F` can be called with `Args...` |
| `std::ranges::range<R>` | `R` has `begin()` and `end()` (from `<ranges>`) |

```cpp run
#include <concepts>
#include <iostream>
#include <string>

template <std::totally_ordered T>
const T& biggest(const T& a, const T& b) { return a < b ? b : a; }

template <typename F>
    requires std::invocable<F, int>
void callWithFive(F f) { f(5); }

int main() {
    std::cout << biggest(3, 9) << ' ' << biggest(std::string("pear"), std::string("apple")) << '\n';
    callWithFive([](int n) { std::cout << "got " << n << '\n'; });
}
```

```output
9 pear
got 5
```

(The `[](int n) { ... }` is a **lambda**, an unnamed function written inline. Module 14 covers them;
here it's simply "a callable that takes an int".)

## Writing your own concepts

A concept is defined with the keyword `concept`, a name and a boolean constant expression:

```cpp
template <typename T>
concept Number = std::integral<T> || std::floating_point<T>;
```

For requirements that aren't just "is this some kind of type", use a **requires expression**:
`requires (parameters) { requirements; }`. It doesn't run anything; the compiler only checks whether each
requirement *would compile*. The result is `true` or `false`.

```cpp
template <typename T>
concept Addable = requires(T a, T b) {
    a + b;                          // simple requirement: this expression must be valid
};
```

There are four kinds of requirement inside the braces:

```cpp
template <typename T>
concept Container = requires(T c, const T& cc) {
    c.size();                                   // 1. simple: expression must compile
    typename T::value_type;                     // 2. type: this nested type must exist
    { cc.size() } -> std::convertible_to<std::size_t>;   // 3. compound: compiles AND result satisfies a concept
    { c.begin() } -> std::same_as<typename T::iterator>;
    requires sizeof(typename T::value_type) > 0;         // 4. nested: this constant must be true
};
```

In a compound requirement `{ expr } -> Concept<Args>;`, the type of `expr` is inserted as the concept's
first argument, so `-> std::convertible_to<std::size_t>` checks `std::convertible_to<decltype(expr), std::size_t>`.
You can also add `noexcept` after the braces to require that the expression can't throw.

Here is a complete example with a custom concept:

```cpp run
#include <concepts>
#include <iostream>
#include <string>

template <typename T>
concept Shape = requires(const T& s) {
    { s.area() } -> std::convertible_to<double>;
    { s.name() } -> std::convertible_to<std::string>;
};

struct Square {
    double side;
    double area() const { return side * side; }
    std::string name() const { return "square"; }
};

struct Rect {
    double w, h;
    double area() const { return w * h; }
    std::string name() const { return "rectangle"; }
};

template <Shape S>
void report(const S& s) {
    std::cout << s.name() << " with area " << s.area() << '\n';
}

int main() {
    report(Square{3});
    report(Rect{2, 5});
    static_assert(Shape<Square>);       // concepts are usable as bool constants
    static_assert(!Shape<int>);
}
```

```output
square with area 9
rectangle with area 10
```

Notice that `Square` and `Rect` don't inherit from anything. A concept checks what a type **can do**,
not what it derives from. Compare this with the virtual-function interfaces from the inheritance module:
concepts are checked at compile time and cost nothing at run time, but you can't put a `Square` and a
`Rect` in the same `std::vector`.

## Overloading on concepts

Several overloads can have different constraints. The compiler picks the one whose constraints are
satisfied, and if more than one is, the **more constrained** one wins:

```cpp run
#include <concepts>
#include <iostream>

void describe(std::integral auto x)       { std::cout << x << " is an integer\n"; }
void describe(std::floating_point auto x) { std::cout << x << " is floating point\n"; }
void describe(auto x)                     { std::cout << x << " is something else\n"; }

template <std::integral T>
void sign(T) { std::cout << "some integer\n"; }

template <std::signed_integral T>          // signed_integral includes integral, so it's more constrained
void sign(T x) { std::cout << (x < 0 ? "negative" : "non-negative") << " signed integer\n"; }

int main() {
    describe(42);
    describe(2.5);
    describe('c');          // char is an integral type!
    describe("text");
    sign(-3);
    sign(3u);
}
```

```output
42 is an integer
2.5 is floating point
c is an integer
text is something else
negative signed integer
some integer
```

"More constrained" only works when the compiler can see one constraint is built *from* the other (as
`std::signed_integral` is defined in terms of `std::integral`). Two unrelated concepts that both match
give an ambiguity error.

## `requires` in other places

A requires expression is just a `bool`, so you can use it directly. Combined with `if constexpr`, it
asks "does this compile?":

```cpp run
#include <iostream>
#include <string>
#include <vector>

template <typename T>
void printSize(const T& value) {
    if constexpr (requires { value.size(); }) {
        std::cout << "size " << value.size() << '\n';
    } else {
        std::cout << "no size\n";
    }
}

// requires requires: an ad-hoc requires expression inside a requires clause
template <typename T>
    requires requires(T x) { x.push_back(x.front()); }
void duplicateFirst(T& c) { c.push_back(c.front()); }

int main() {
    printSize(std::string("hello"));
    printSize(std::vector<int>{1, 2});
    printSize(42);

    std::vector<int> v{7, 8};
    duplicateFirst(v);
    std::cout << v.size() << ' ' << v.back() << '\n';
}
```

```output
size 5
size 2
no size
3 7
```

`requires requires` looks odd: the first `requires` starts a clause, the second starts an expression.
It's legal, but naming the concept is usually clearer.

## Concepts vs. the older tools

| Goal | Before C++20 | C++20 |
| --- | --- | --- |
| Reject wrong types with a clear message | `static_assert` inside the body | constrain the parameter |
| Choose between overloads by type | SFINAE with `std::enable_if_t` | overloads with different concepts |
| Branch inside one function | `if constexpr` + traits | `if constexpr` + traits or `requires` |

A failed concept also means the overload simply isn't a candidate, so other overloads can still be
chosen. A failed `static_assert` is always a hard error.

## Common mistakes

- **Forgetting `#include <concepts>`**: you get `'integral' is not a member of 'std'`.
- **Expecting a requires expression to run code**: it only checks that the code *would compile*.
- **`std::integral auto` on two parameters means two different types**: `f(std::integral auto a,
  std::integral auto b)` accepts `f(1, 'c')`. Use `template <std::integral T> f(T a, T b)` to force the
  same type.
- **`char` and `bool` are integral**: `std::integral` accepts them too.

:::quiz
Which declarations accept `f(5)` but reject `f(5.0)`? (select all that apply)

- [x] `template <std::integral T> void f(T);`
- [x] `void f(std::integral auto);`
- [x] `template <typename T> requires std::integral<T> void f(T);`
- [ ] `template <typename T> requires std::integral<T> || std::floating_point<T> void f(T);`

The first three are the same constraint written three ways. The last one also accepts floating-point types.
:::

:::quiz
What does this requirement inside a requires expression check?

```cpp
{ x.size() } -> std::convertible_to<std::size_t>;
```

- [ ] That `x.size()` returns exactly `std::size_t`
- [x] That `x.size()` compiles and its type converts to `std::size_t`
- [ ] It calls `x.size()` and checks the result is positive
- [ ] That `x` converts to `std::size_t`

A compound requirement checks the expression is valid and that its type satisfies the concept, with the
type inserted as the first argument. Nothing is executed.
:::

:::exercise Integral-only gcd
Write `gcd(a, b)` (greatest common divisor, Euclid's algorithm) as a template constrained with
`std::integral`. Assume the inputs are non-negative and not both zero.

**Input:** two integers, then two more integers that may be very large (read them as `long long`).
**Output:** two lines: the gcd of the first pair and the gcd of the second pair.

```cpp starter
#include <concepts>
#include <iostream>

template <typename T>
T gcd(T a, T b) {
    // Euclid: while b != 0, replace (a, b) with (b, a % b)
    return a;
}

int main() {
    int a, b;
    long long c, d;
    std::cin >> a >> b >> c >> d;
    std::cout << gcd(a, b) << '\n';
    std::cout << gcd(c, d) << '\n';
}
```

```cpp solution
#include <concepts>
#include <iostream>

template <std::integral T>
T gcd(T a, T b) {
    while (b != 0) {
        T r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    int a, b;
    long long c, d;
    std::cin >> a >> b >> c >> d;
    std::cout << gcd(a, b) << '\n';
    std::cout << gcd(c, d) << '\n';
}
```

```hint
Replace `typename` with `std::integral` in the template parameter list, then write the loop.
```

```stdin
12 18
1000000000000 250000000000
```

```expected
6
250000000000
```

```stdin
7 0
13 17
```

```expected hidden
7
1
```

```checks
must std::integral :: Constrain T with std::integral.
```
:::

:::exercise Half of a number
Write two overloads of `half` using abbreviated, constrained `auto` parameters:

- `half(std::integral auto x)` returns `x / 2` (integer division),
- `half(std::floating_point auto x)` returns `x / 2` as a floating-point value.

**Input:** an integer and a decimal number.
**Output:** two lines: `half` of the integer, then `half` of the decimal.

```cpp starter
#include <concepts>
#include <iostream>

auto half(auto x) {
    return x;
}

int main() {
    int i;
    double d;
    std::cin >> i >> d;
    std::cout << half(i) << '\n';
    std::cout << half(d) << '\n';
}
```

```cpp solution
#include <concepts>
#include <iostream>

auto half(std::integral auto x) {
    return x / 2;
}

auto half(std::floating_point auto x) {
    return x / 2;
}

int main() {
    int i;
    double d;
    std::cin >> i >> d;
    std::cout << half(i) << '\n';
    std::cout << half(d) << '\n';
}
```

```hint
The bodies are identical; the point is that the concept selects which overload runs. Write
`auto half(std::integral auto x)` and `auto half(std::floating_point auto x)`.
```

```stdin
7 7
```

```expected
3
3.5
```

```stdin
-9 0.5
```

```expected hidden
-4
0.25
```

```checks
must std::integral\s+auto :: Write half(std::integral auto x).
must std::floating_point\s+auto :: Write half(std::floating_point auto x).
```
:::

:::exercise Sized things
Write a concept `Sized` that is satisfied by any type `T` for which, given `const T& c`, the expression
`c.size()` compiles and converts to `std::size_t`. Then write two overloads of `describe`:

- one constrained with `Sized` that prints `size N`,
- one for any other type that prints `value V`.

**Input:** a word, an integer, then `n` and `n` integers.
**Output:** three lines: `describe` of the word, of the integer, and of a `std::vector<int>` holding the
`n` integers.

```cpp starter
#include <concepts>
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

// define the concept Sized here

void describe(const auto& x) {
    std::cout << "value " << x << '\n';
}

int main() {
    std::string w;
    int i, n;
    std::cin >> w >> i >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    describe(w);
    describe(i);
    // describe(v);   // doesn't compile yet: a vector can't be printed with <<
}
```

```cpp solution
#include <concepts>
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

template <typename T>
concept Sized = requires(const T& c) {
    { c.size() } -> std::convertible_to<std::size_t>;
};

void describe(const Sized auto& x) {
    std::cout << "size " << x.size() << '\n';
}

void describe(const auto& x) {
    std::cout << "value " << x << '\n';
}

int main() {
    std::string w;
    int i, n;
    std::cin >> w >> i >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    describe(w);
    describe(i);
    describe(v);
}
```

```hint
`template <typename T> concept Sized = requires(const T& c) { { c.size() } -> std::convertible_to<std::size_t>; };`
```

```hint
Keep the unconstrained `describe(const auto& x)` and add `describe(const Sized auto& x)`. For a string,
both match, and the constrained one wins because it's more constrained.
```

```stdin
hello 42 3 1 2 3
```

```expected
size 5
value 42
size 3
```

```stdin
x -1 0
```

```expected hidden
size 1
value -1
size 0
```

```checks
must concept\s+Sized :: Define a concept named Sized.
must requires\s*\( :: Use a requires expression.
must Sized\s+auto|<\s*Sized\s+\w+\s*>|requires\s+Sized\s*< :: Use Sized to constrain an overload.
```
:::

:::exercise Report shapes
Write a concept `Shape` requiring that, for `const T& s`, `s.area()` converts to `double` and
`s.name()` converts to `std::string`. Write two structs that satisfy it, `Square` (with a `side`) and
`Rect` (with `w` and `h`), and a constrained function template `report` that prints
`<name>: <area>`.

**Input:** the side of a square, then the width and height of a rectangle (all integers).
**Output:** two lines: `square: <area>` and `rectangle: <area>`.

```cpp starter
#include <concepts>
#include <iostream>
#include <string>

struct Square {
    double side;
};

int main() {
    double s, w, h;
    std::cin >> s >> w >> h;
    Square sq{s};
    std::cout << "square: " << sq.side << '\n';
}
```

```cpp solution
#include <concepts>
#include <iostream>
#include <string>

template <typename T>
concept Shape = requires(const T& s) {
    { s.area() } -> std::convertible_to<double>;
    { s.name() } -> std::convertible_to<std::string>;
};

struct Square {
    double side;
    double area() const { return side * side; }
    std::string name() const { return "square"; }
};

struct Rect {
    double w, h;
    double area() const { return w * h; }
    std::string name() const { return "rectangle"; }
};

template <Shape S>
void report(const S& s) {
    std::cout << s.name() << ": " << s.area() << '\n';
}

int main() {
    double s, w, h;
    std::cin >> s >> w >> h;
    report(Square{s});
    report(Rect{w, h});
}
```

```hint
Give each struct two `const` member functions, `area()` and `name()`. They don't need a common base class.
```

```hint
`template <Shape S> void report(const S& s) { ... }`.
```

```stdin
3 2 5
```

```expected
square: 9
rectangle: 10
```

```stdin
0 7 1
```

```expected hidden
square: 0
rectangle: 7
```

```checks
must concept\s+Shape :: Define a concept named Shape.
must ->\s*std::convertible_to :: Use compound requirements with std::convertible_to.
must <\s*Shape\s+\w+\s*>|Shape\s+auto :: Constrain report with the Shape concept.
```
:::
