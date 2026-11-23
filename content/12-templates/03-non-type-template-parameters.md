---
title: Non-Type Template Parameters
summary: Templates parameterized by values like sizes and counts, std::array, auto non-type parameters, and sizes known at compile time.
---

## Values as template parameters

So far every template parameter has been a **type** (`typename T`). A template parameter can also be a
**value**, such as an integer. This is called a **non-type template parameter** (NTTP):

```cpp run
#include <iostream>

template <int N>
int multiplyBy(int x) {
    return x * N;
}

int main() {
    std::cout << multiplyBy<3>(5) << '\n';     // N = 3
    std::cout << multiplyBy<10>(5) << '\n';    // N = 10, a different function
}
```

```output
15
50
```

`template <int N>` declares a parameter `N` of type `int`. Inside the template, `N` is a **compile-time
constant**: the compiler knows its exact value, just like a literal. `multiplyBy<3>` and
`multiplyBy<10>` are two separate instantiations, each with the number baked in.

Because the value is used at compile time, the argument must be a **constant expression**. A value read
at run time won't do:

```cpp compile-error
#include <iostream>

template <int N>
int multiplyBy(int x) { return x * N; }

int main() {
    int n;
    std::cin >> n;
    std::cout << multiplyBy<n>(5);   // error: the value of 'n' is not usable in a constant expression
}
```

`constexpr` variables, literals and arithmetic on them are all fine: `multiplyBy<2 * 4>(1)` works, and
so does `constexpr int k = 7; multiplyBy<k>(1);`.

## Mixing type and value parameters: a fixed-size array

The classic use is a size. Here is a tiny fixed-size array class. The size is part of the **type**, so
it needs no heap allocation, and `size()` costs nothing at run time:

```cpp run
#include <cstddef>
#include <iostream>

template <typename T, std::size_t N>
class FixedArray {
public:
    T& operator[](std::size_t i) { return data_[i]; }
    const T& operator[](std::size_t i) const { return data_[i]; }
    constexpr std::size_t size() const { return N; }

private:
    T data_[N]{};          // N must be a constant here, and it is
};

int main() {
    FixedArray<int, 4> a;
    for (std::size_t i = 0; i < a.size(); ++i) a[i] = static_cast<int>(i * i);
    for (std::size_t i = 0; i < a.size(); ++i) std::cout << a[i] << ' ';
    std::cout << '\n';

    FixedArray<char, 2> b;
    b[0] = 'o';
    b[1] = 'k';
    std::cout << b[0] << b[1] << " size " << b.size() << '\n';
}
```

```output
0 1 4 9
ok size 2
```

`FixedArray<int, 4>` and `FixedArray<int, 5>` are **different types**. You can't assign one to the other,
and a function taking `FixedArray<int, 4>` won't accept the 5 version.

## `std::array`: the standard version

That class is essentially `std::array<T, N>` from `<array>`. It wraps a plain C array, knows its size,
can be copied and compared, and works with range-for and algorithms:

```cpp run
#include <array>
#include <iostream>

int main() {
    std::array<int, 5> a{5, 3, 8, 1, 4};
    std::array b{1.5, 2.5};                 // CTAD: std::array<double, 2>

    int total = 0;
    for (int x : a) total += x;
    std::cout << "size " << a.size() << ", total " << total << '\n';
    std::cout << "front " << a.front() << ", back " << a.back() << '\n';
    std::cout << b[0] + b[1] << '\n';

    std::array<int, 5> copy = a;            // arrays copy as a whole
    std::cout << std::boolalpha << (copy == a) << '\n';
}
```

```output
size 5, total 21
front 5, back 4
4
true
```

## Deducing `N`

Function templates can **deduce** a non-type parameter from an argument whose type contains it. This
lets you write one function for `std::array`s of every size:

```cpp run
#include <array>
#include <cstddef>
#include <iostream>

template <typename T, std::size_t N>
T sum(const std::array<T, N>& arr) {
    T total{};
    for (const T& x : arr) total += x;
    return total;
}

// Works on plain C arrays too: a reference to an array of N elements
template <typename T, std::size_t N>
constexpr std::size_t countOf(const T (&)[N]) {
    return N;
}

int main() {
    std::array<int, 3> small{1, 2, 3};
    std::array<double, 4> big{0.5, 0.5, 0.5, 0.5};
    std::cout << sum(small) << ' ' << sum(big) << '\n';   // N deduced as 3 and 4

    int raw[] = {9, 8, 7, 6, 5, 4};
    std::cout << countOf(raw) << '\n';                    // N deduced as 6
}
```

```output
6 2
6
```

`const T (&)[N]` reads "reference to an array of `N` `T`s" (the parameter has no name because we don't
need it). This is how `std::size(raw)` works internally.

## `auto` non-type parameters (C++17)

Writing `template <auto V>` lets the **type** of the value be deduced too. `V` could be an `int`, a
`char`, a `bool`, a `long long`...

```cpp run
#include <iostream>

template <auto V>
void showConstant() {
    std::cout << V << '\n';
}

template <auto Value>
struct Constant {
    static constexpr auto value = Value;
};

int main() {
    showConstant<42>();         // V is an int
    showConstant<'x'>();        // V is a char
    showConstant<10'000'000'000LL>();   // V is a long long
    std::cout << Constant<7>::value * 2 << '\n';
}
```

```output
42
x
10000000000
14
```

## What can be a non-type parameter?

| Allowed | Example |
| --- | --- |
| Integral types (`int`, `std::size_t`, `char`, `bool`, ...) | `template <int N>` |
| Enumerations | `template <Color C>` |
| Pointers and references to objects/functions with static storage | `template <const char* Name>` |
| `auto` (C++17) | `template <auto V>` |
| Floating-point types (C++20) | `template <double Factor>` |
| Simple "structural" class types (C++20): all members public and themselves allowed | `template <Point P>` |

`std::string` is **not** allowed (it isn't structural), and neither are values only known at run time.

```cpp run
#include <iostream>

enum class Unit { Meters, Feet };

template <Unit U>
double toMeters(double value) {
    if (U == Unit::Feet) return value * 0.3048;
    return value;
}

template <double Factor>          // C++20
double scale(double x) { return x * Factor; }

int main() {
    std::cout << toMeters<Unit::Meters>(10) << ' ' << toMeters<Unit::Feet>(10) << '\n';
    std::cout << scale<1.5>(4) << '\n';
}
```

```output
10 3.048
6
```

## Compile-time computation

Because NTTPs are compile-time values, they can drive compile-time calculations. Before `constexpr`
functions existed, people computed things with recursive templates like this:

```cpp run
#include <iostream>

template <unsigned N>
struct Factorial {
    static constexpr unsigned long long value = N * Factorial<N - 1>::value;
};

template <>                       // the "stop" case (a specialization, next lesson)
struct Factorial<0> {
    static constexpr unsigned long long value = 1;
};

int main() {
    static_assert(Factorial<5>::value == 120);   // checked by the compiler
    std::cout << Factorial<10>::value << '\n';
}
```

```output
3628800
```

`static_assert(condition)` stops compilation if the condition is false, and costs nothing at run time.
Today a `constexpr` function is usually simpler, but you'll still see this pattern in older code.

## Common mistakes

- **Run-time value as template argument**: `std::array<int, n>` with a non-`constexpr` `n` doesn't compile.
  Use `std::vector` when the size is only known at run time.
- **Mismatched parameter types**: `std::array`'s size is a `std::size_t`. When deducing it, declare your
  parameter as `std::size_t N`, not `int N`, or deduction fails.
- **Code bloat**: every distinct value creates a new instantiation. Don't use an NTTP for something that
  takes thousands of different values.

:::quiz
Which of these compile? (select all that apply)

```cpp
constexpr int k = 3;
int n = 3;
```

- [x] `std::array<int, k> a;`
- [ ] `std::array<int, n> b;`
- [x] `std::array<int, 2 + 1> c;`
- [x] `std::array<int, sizeof(int)> d;`

Template arguments must be constant expressions. `k` is `constexpr`, `2 + 1` and `sizeof(int)` are
computed at compile time, but `n` is an ordinary variable.
:::

:::quiz
Are `std::array<int, 3>` and `std::array<int, 4>` the same type?

- [ ] Yes, the size is just stored inside
- [x] No, they are different types
- [ ] Only if you compile with `-O2`

The size is a template argument, so each size makes a distinct instantiation and a distinct type.
:::

:::exercise Power of N {easy}
Write a function template `template <int N> long long power(long long x)` that returns `x` raised to
the compile-time exponent `N` (assume `N >= 0`).

**Input:** one integer `x`.
**Output:** three lines: `power<0>(x)`, `power<2>(x)` and `power<3>(x)`.

```cpp starter
#include <iostream>

long long power(long long x, int n) {
    long long result = 1;
    for (int i = 0; i < n; ++i) result *= x;
    return result;
}

int main() {
    long long x;
    std::cin >> x;
    std::cout << power(x, 0) << '\n';
    // make the exponent a template parameter: power<2>(x), power<3>(x)
}
```

```cpp solution
#include <iostream>

template <int N>
long long power(long long x) {
    long long result = 1;
    for (int i = 0; i < N; ++i) result *= x;
    return result;
}

int main() {
    long long x;
    std::cin >> x;
    std::cout << power<0>(x) << '\n';
    std::cout << power<2>(x) << '\n';
    std::cout << power<3>(x) << '\n';
}
```

```hint
Move the exponent from the function parameters into `template <int N>` and loop `N` times.
```

```stdin
5
```

```expected
1
25
125
```

```stdin
-3
```

```expected hidden
1
9
-27
```

```stdin
0
```

```expected hidden
1
0
0
```

```stdin
100000
```

```expected hidden
1
10000000000
1000000000000000
```

```checks
must template\s*<\s*int\s+\w+\s*> :: Use template <int N>.
must power\s*<\s*3\s*> :: Call power<3>(x).
```
:::

:::exercise Sum any std::array {easy}
Write **one** function template `sumArray` that returns the sum of a `std::array<T, N>` of any element
type and any size, deducing both `T` and `N`.

**Input:** 5 integers, then 3 decimal numbers.
**Output:** the sum of the integers on the first line, the sum of the decimals on the second.

```cpp starter
#include <array>
#include <iostream>

int sumArray(const std::array<int, 5>& arr) {
    int total = 0;
    for (int x : arr) total += x;
    return total;
}

int main() {
    std::array<int, 5> ints{};
    std::array<double, 3> reals{};
    for (int& x : ints) std::cin >> x;
    for (double& x : reals) std::cin >> x;
    std::cout << sumArray(ints) << '\n';
    // make sumArray work for reals too
}
```

```cpp solution
#include <array>
#include <cstddef>
#include <iostream>

template <typename T, std::size_t N>
T sumArray(const std::array<T, N>& arr) {
    T total{};
    for (const T& x : arr) total += x;
    return total;
}

int main() {
    std::array<int, 5> ints{};
    std::array<double, 3> reals{};
    for (int& x : ints) std::cin >> x;
    for (double& x : reals) std::cin >> x;
    std::cout << sumArray(ints) << '\n';
    std::cout << sumArray(reals) << '\n';
}
```

```hint
`template <typename T, std::size_t N> T sumArray(const std::array<T, N>& arr)`. Start the total at `T{}`
(zero for numbers).
```

```stdin
1 2 3 4 5
0.5 0.25 1
```

```expected
15
1.75
```

```stdin
-1 -1 -1 -1 4
0 0 0
```

```expected hidden
0
0
```

```stdin
0 0 0 0 0
-0.5 -0.25 0.125
```

```expected hidden
0
-0.625
```

```checks
must std::size_t\s+\w+\s*> :: Make the size a std::size_t template parameter.
must std::array\s*<\s*T\s*,\s*\w+\s*> :: Take a std::array<T, N> parameter.
```
:::

:::exercise Transpose with compile-time sizes {medium}
A matrix stored as `std::array<std::array<T, C>, R>` has `R` rows and `C` columns, and both sizes are
part of its **type**. Write one function template that transposes any such matrix, deducing `T`, `R`
and `C`:

```cpp
template <typename T, std::size_t R, std::size_t C>
std::array<std::array<T, R>, C> transpose(const std::array<std::array<T, C>, R>& m);
```

The result has `C` rows and `R` columns: `result[j][i] == m[i][j]`. Notice that the compiler now
checks the shapes for you: assigning the result to a variable of the wrong size doesn't compile.

**Input:** a 2×3 matrix of integers (two rows of three), then a 1×4 matrix of words (one row of four).
**Output:** the 3×2 transpose of the integers, then the 4×1 transpose of the words: one matrix row per
line, values separated by single spaces.

```cpp starter
#include <array>
#include <cstddef>
#include <iostream>
#include <string>

int main() {
    std::array<std::array<int, 3>, 2> a{};
    for (auto& row : a)
        for (int& x : row) std::cin >> x;
    std::array<std::array<std::string, 4>, 1> w{};
    for (auto& row : w)
        for (auto& s : row) std::cin >> s;

    // print transpose(a), then transpose(w)
}
```

```cpp solution
#include <array>
#include <cstddef>
#include <iostream>
#include <string>

template <typename T, std::size_t R, std::size_t C>
std::array<std::array<T, R>, C> transpose(const std::array<std::array<T, C>, R>& m) {
    std::array<std::array<T, R>, C> result{};
    for (std::size_t i = 0; i < R; ++i)
        for (std::size_t j = 0; j < C; ++j) result[j][i] = m[i][j];
    return result;
}

template <typename T, std::size_t R, std::size_t C>
void print(const std::array<std::array<T, C>, R>& m) {
    for (const auto& row : m) {
        for (std::size_t j = 0; j < C; ++j) {
            if (j > 0) std::cout << ' ';
            std::cout << row[j];
        }
        std::cout << '\n';
    }
}

int main() {
    std::array<std::array<int, 3>, 2> a{};
    for (auto& row : a)
        for (int& x : row) std::cin >> x;
    std::array<std::array<std::string, 4>, 1> w{};
    for (auto& row : w)
        for (auto& s : row) std::cin >> s;

    std::array<std::array<int, 2>, 3> t = transpose(a);   // the shape is checked at compile time
    print(t);
    print(transpose(w));
}
```

```hint
Both sizes are deduced from the argument's type, exactly like `N` in `sumArray`. Inside, loop
`i` over `R` rows and `j` over `C` columns and copy `m[i][j]` into `result[j][i]`.
```

```hint
A printing helper can be a template with the same three parameters:
`template <typename T, std::size_t R, std::size_t C> void print(const std::array<std::array<T, C>, R>& m)`.
```

```stdin
1 2 3
4 5 6
a b c d
```

```expected
1 4
2 5
3 6
a
b
c
d
```

```stdin
-1 0 7
8 -9 10
one two three four
```

```expected hidden
-1 8
0 -9
7 10
one
two
three
four
```

```checks
must template\s*<\s*typename\s+\w+\s*,\s*std::size_t\s+\w+\s*,\s*std::size_t\s+\w+\s*> :: Deduce T, R and C: template <typename T, std::size_t R, std::size_t C>.
must transpose\s*\(\s*a\s*\) :: Call transpose(a).
must transpose\s*\(\s*w\s*\) :: Call transpose(w).
```
:::

:::exercise Last N values {hard}
Write a class template `template <std::size_t N> class LastN` that remembers only the **last `N`**
integers given to it, using a `std::array<int, N>` as a circular buffer (overwrite the oldest value
when full). Give it `void add(int)` and a way to print the stored values from oldest to newest.

Use `LastN<3>`.

**Input:** any number of integers (read until the input ends).
**Output:** the last 3 values (or fewer, if fewer were given) from oldest to newest, separated by
single spaces, on one line. If there were no values at all, print `nothing`.

```cpp starter
#include <array>
#include <cstddef>
#include <iostream>

// write template <std::size_t N> class LastN here

int main() {
    int x;
    while (std::cin >> x) {
        // add x to a LastN<3>
    }
    std::cout << "nothing\n";
}
```

```cpp solution
#include <array>
#include <cstddef>
#include <iostream>

template <std::size_t N>
class LastN {
public:
    void add(int value) {
        data_[next_] = value;
        next_ = (next_ + 1) % N;
        if (count_ < N) ++count_;
    }

    void print() const {
        if (count_ == 0) {
            std::cout << "nothing\n";
            return;
        }
        // the oldest element is count_ positions behind next_
        std::size_t start = (next_ + N - count_) % N;
        for (std::size_t i = 0; i < count_; ++i) {
            if (i > 0) std::cout << ' ';
            std::cout << data_[(start + i) % N];
        }
        std::cout << '\n';
    }

private:
    std::array<int, N> data_{};
    std::size_t next_ = 0;   // where the next value goes
    std::size_t count_ = 0;  // how many values are stored (at most N)
};

int main() {
    LastN<3> last;
    int x;
    while (std::cin >> x) last.add(x);
    last.print();
}
```

```hint
Keep an index `next_` where the next value goes, and advance it with `next_ = (next_ + 1) % N;`.
Also count how many values are stored, up to `N`.
```

```hint
The oldest stored value is at index `(next_ + N - count_) % N`. Print `count_` values from there,
wrapping around with `% N`.
```

```stdin
1 2 3 4 5 6 7
```

```expected
5 6 7
```

```stdin
10 20
```

```expected hidden
10 20
```

```stdin
```

```expected hidden
nothing
```

```stdin
4 5 6
```

```expected hidden
4 5 6
```

```stdin
1 2 3 4
```

```expected hidden
2 3 4
```

```stdin
-1
```

```expected hidden
-1
```

```checks
must template\s*<\s*std::size_t\s+\w+\s*>\s*(class|struct)\s+LastN :: Declare LastN as template <std::size_t N>.
must std::array\s*<\s*int\s*,\s*N\s*> :: Store the values in a std::array<int, N>.
must LastN\s*<\s*3\s*> :: Use LastN<3>.
```
:::
