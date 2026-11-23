---
title: Numeric Algorithms
summary: The <numeric> header. accumulate (and its init-type trap), reduce, inner_product, partial_sum for prefix sums, adjacent_difference, gcd and lcm.
---

## The `<numeric>` header

A handful of algorithms live in **`<numeric>`** instead of `<algorithm>`. They **fold** a range
into a single value, or compute running totals and differences. You already met `std::iota` from
this header. Forgetting the include is a classic compile error:

```cpp compile-error
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};
    std::cout << std::accumulate(v.begin(), v.end(), 0);   // error: 'accumulate' is not a member of 'std'
}
```

## `std::accumulate`

`std::accumulate(first, last, init)` starts with `init` and adds every element to it, left to
right: `((init + v0) + v1) + v2 ...`. With a fourth argument, it uses your operation instead of `+`:

```cpp run
#include <functional>
#include <iostream>
#include <iterator>
#include <numeric>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5};

    int sum = std::accumulate(v.begin(), v.end(), 0);
    int product = std::accumulate(v.begin(), v.end(), 1, std::multiplies<>{});
    int sum_sq = std::accumulate(v.begin(), v.end(), 0, [](int acc, int x) { return acc + x * x; });

    std::cout << sum << ' ' << product << ' ' << sum_sq << '\n';

    // The accumulator can be any type: build a string
    std::vector<std::string> words{"one", "two", "three"};
    std::string joined = std::accumulate(std::next(words.begin()), words.end(), words[0],
                                         [](std::string acc, const std::string& w) { return acc + ", " + w; });
    std::cout << joined << '\n';
}
```

```output
15 120 55
one, two, three
```

The operation receives `(accumulator, element)` **in that order**, and returns the new accumulator.

### The init-type trap

The **type of `init`** is the type `accumulate` uses for the running total and returns. If you pass
`0` (an `int`) to sum `double`s, every partial sum is converted back to `int`, silently dropping
the fractions:

```cpp run
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<double> prices{1.5, 2.25, 3.75};

    auto wrong = std::accumulate(prices.begin(), prices.end(), 0);     // int: 0+1.5 -> 1, 1+2.25 -> 3, ...
    auto right = std::accumulate(prices.begin(), prices.end(), 0.0);   // double

    std::cout << wrong << " vs " << right << '\n';
}
```

```output
6 vs 7.5
```

The same trap applies to overflow: summing many large `int`s with `init` `0` overflows an `int`.
Use `0LL` (a `long long`) to get a 64-bit total:

```cpp
long long total = std::accumulate(v.begin(), v.end(), 0LL);
```

> **Pitfall:** No warning saves you here: the conversion happens inside the library header. Make
> `init` match the result you want: `0.0` for doubles, `0LL` for big integer sums, `std::string{}`
> for strings.

## `std::reduce`

`std::reduce` (C++17) looks like `accumulate`, but it's allowed to combine the elements **in any
order and grouping**. That lets it run in parallel (with an *execution policy* like
`std::execution::par`, from `<execution>`), but it means your operation must be **associative and
commutative** (like `+` and `*`, not `-`). Without an `init`, it starts from a value-initialized
element (`0` for numbers).

```cpp run
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4};

    std::cout << std::reduce(v.begin(), v.end()) << ' '              // init defaults to int{} = 0
              << std::reduce(v.begin(), v.end(), 100) << ' '
              << std::reduce(v.begin(), v.end(), 1, [](int a, int b) { return a * b; }) << '\n';
}
```

```output
10 110 24
```

`std::transform_reduce` combines a transform with a reduce in one pass (for example "sum of squares"
or "dot product"), and also supports parallel execution.

Rule of thumb: use `accumulate` when order matters or the operation isn't commutative (building a
string, subtracting); `reduce` for plain sums and products, especially big ones.

## `std::inner_product`

`std::inner_product(a_first, a_last, b_first, init)` multiplies pairs of elements and sums the
products: the **dot product**. With two extra operations you can replace the "sum" and the
"multiply":

```cpp run
#include <functional>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 3};
    std::vector<int> b{4, 5, 6};

    // 0 + 1*4 + 2*5 + 3*6
    std::cout << std::inner_product(a.begin(), a.end(), b.begin(), 0) << '\n';

    // Count positions where a and b agree: "sum" with +, "multiply" with ==
    std::vector<int> x{1, 2, 3, 4};
    std::vector<int> y{1, 0, 3, 0};
    int same = std::inner_product(x.begin(), x.end(), y.begin(), 0, std::plus<>{}, std::equal_to<>{});
    std::cout << same << " positions match\n";
}
```

```output
32
2 positions match
```

The second range must have at least as many elements as the first.

## `std::partial_sum`: running totals

`std::partial_sum(first, last, d_first)` writes the running total: output `i` is the sum of input
elements `0..i`. These **prefix sums** are a classic trick: once you have them, the sum of any slice
`v[l..r]` is `prefix[r] - prefix[l - 1]`, in O(1).

```cpp run
#include <algorithm>
#include <functional>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> v{3, 1, 4, 1, 5};

    std::vector<int> prefix(v.size());
    std::partial_sum(v.begin(), v.end(), prefix.begin());
    for (int p : prefix) std::cout << p << ' ';       // 3 4 8 9 14
    std::cout << '\n';

    // sum of v[1..3] (1 + 4 + 1)
    std::cout << prefix[3] - prefix[0] << '\n';

    // running maximum, using a different operation
    std::vector<int> w{2, 7, 1, 8, 2};
    std::vector<int> best(w.size());
    std::partial_sum(w.begin(), w.end(), best.begin(), [](int a, int b) { return std::max(a, b); });
    for (int b : best) std::cout << b << ' ';
    std::cout << '\n';
}
```

```output
3 4 8 9 14 
6
2 7 7 8 8 
```

The output can be the input itself (`std::partial_sum(v.begin(), v.end(), v.begin())`).
`std::inclusive_scan` and `std::exclusive_scan` (C++17) are the parallel-friendly relatives.

## `std::adjacent_difference`

The opposite of `partial_sum`: output `0` is a copy of input `0`, and each following output is
`v[i] - v[i - 1]`. Useful for "how much did it change since last time?"

```cpp run
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> readings{10, 12, 15, 15, 9};
    std::vector<int> diff(readings.size());
    std::adjacent_difference(readings.begin(), readings.end(), diff.begin());

    for (int d : diff) std::cout << d << ' ';   // first element is copied unchanged
    std::cout << '\n';
}
```

```output
10 2 3 0 -6 
```

Applying `partial_sum` to the differences gives you back the original sequence.

## `std::gcd` and `std::lcm`

C++17 added the **greatest common divisor** and **least common multiple** for integers. Both work
with negative numbers (the result is non-negative), and `gcd(0, n)` is `|n|`:

```cpp run
#include <iostream>
#include <numeric>

int main() {
    std::cout << std::gcd(12, 18) << ' ' << std::lcm(4, 6) << '\n';
    std::cout << std::gcd(-12, 18) << ' ' << std::gcd(0, 7) << ' ' << std::lcm(0, 5) << '\n';

    // Reduce a fraction
    int num = 42, den = 56;
    int g = std::gcd(num, den);
    std::cout << num << '/' << den << " = " << num / g << '/' << den / g << '\n';
}
```

```output
6 12
6 7 0
42/56 = 3/4
```

`std::gcd` and `std::lcm` are function templates, so you can't pass them directly to
`accumulate` by name. Wrap them in a lambda instead:

```cpp
long long g = std::accumulate(v.begin(), v.end(), 0LL, [](long long a, long long b) { return std::gcd(a, b); });
```

C++20 also added `std::midpoint(a, b)`, which computes the middle of two numbers without overflow.

:::quiz
`v` is a `std::vector<double>{0.5, 0.5, 0.5, 0.5}`. What does `std::accumulate(v.begin(), v.end(), 0)` return?

- [ ] `2.0`
- [x] `0`
- [ ] `2`
- [ ] It doesn't compile

The total has the type of `init`, `int`. Each step computes `int + double`, then truncates back to an `int`: `0 + 0.5` becomes `0`, four times. Use `0.0`.
:::

:::quiz
Why must the operation passed to `std::reduce` be associative and commutative?

- [ ] Because `reduce` only works on integers
- [x] Because `reduce` may combine the elements in any order and grouping (for example, in parallel)
- [ ] Because `reduce` processes elements right to left
- [ ] It doesn't need to be; it's the same as `accumulate`

That freedom is what lets `reduce` split the work. With subtraction, different groupings give different answers. `accumulate` always goes strictly left to right.
:::

:::exercise Average
Read `n` decimal numbers and print their average with exactly two digits after the decimal point.
Compute the sum with `std::accumulate` (watch the type of `init`!). If `n` is `0`, print `no data`.

**Input:** `n`, then `n` decimal numbers.
**Output:** `average: A` (two decimals), or `no data`.

```cpp starter
#include <iomanip>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<double> v(n);
    for (double& x : v) std::cin >> x;

    double sum = 0;
    std::cout << std::fixed << std::setprecision(2) << "average: " << sum << '\n';
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<double> v(n);
    for (double& x : v) std::cin >> x;

    if (v.empty()) {
        std::cout << "no data\n";
        return 0;
    }
    double sum = std::accumulate(v.begin(), v.end(), 0.0);
    std::cout << std::fixed << std::setprecision(2) << "average: " << sum / n << '\n';
}
```

```hint
`std::accumulate(v.begin(), v.end(), 0.0)`: the `0.0` makes the total a `double`.
```

```hint
Handle `n == 0` before dividing.
```

```stdin
4
1.5 2.5 3.25 0.75
```

```expected
average: 2.00
```

```stdin
3
1.4 1.4 1.5
```

```expected
average: 1.43
```

```stdin
0
```

```expected hidden
no data
```

```checks
must accumulate|reduce :: Sum the numbers with std::accumulate (or std::reduce).
mustnot \bfor\s*\(\s*(double|auto|const)[^)]*:\s*v\s*\)\s*(sum|\{) :: Let accumulate do the summing instead of a loop.
```
:::

:::exercise Dot product
Read two vectors of the same length `n` and print their dot product (the sum of `a[i] * b[i]`) using
`std::inner_product`. Values can be large, so the result needs a `long long`.

**Input:** `n`, then `n` integers for `a`, then `n` integers for `b`.
**Output:** the dot product followed by a newline.

```cpp starter
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> a(n), b(n);
    for (auto& x : a) std::cin >> x;
    for (auto& x : b) std::cin >> x;

    std::cout << 0 << '\n';
}
```

```cpp solution
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> a(n), b(n);
    for (auto& x : a) std::cin >> x;
    for (auto& x : b) std::cin >> x;

    std::cout << std::inner_product(a.begin(), a.end(), b.begin(), 0LL) << '\n';
}
```

```hint
`std::inner_product(a.begin(), a.end(), b.begin(), 0LL)`. The `0LL` makes the total a `long long`.
```

```stdin
3
1 2 3
4 5 6
```

```expected
32
```

```stdin
2
1000000 -3
1000000 4
```

```expected
999999999988
```

```stdin
0
```

```expected hidden
0
```

```checks
must inner_product :: Use std::inner_product.
```
:::

:::exercise Slice sums
Read `n` integers, then `q` queries. Each query is `l r` (1-based, `1 <= l <= r <= n`); print the
sum of elements `l` through `r` inclusive.

Build a prefix-sum array **once** with `std::partial_sum`, then answer each query in O(1).

**Input:** `n`, `n` integers, `q`, then `q` lines `l r`.
**Output:** one sum per line.

```cpp starter
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;

    int q;
    std::cin >> q;
    while (q--) {
        int l, r;
        std::cin >> l >> r;
        std::cout << v[l - 1] << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;

    // prefix[i] = v[0] + ... + v[i - 1], with prefix[0] = 0
    std::vector<long long> prefix(n + 1, 0);
    std::partial_sum(v.begin(), v.end(), prefix.begin() + 1);

    int q;
    std::cin >> q;
    while (q--) {
        int l, r;
        std::cin >> l >> r;
        std::cout << prefix[r] - prefix[l - 1] << '\n';
    }
}
```

```hint
Make the prefix vector one element longer, with a `0` in front:
`std::vector<long long> prefix(n + 1, 0);` then `std::partial_sum(v.begin(), v.end(), prefix.begin() + 1);`.
```

```hint
Then `prefix[i]` is the sum of the first `i` elements, and the sum of `l..r` is `prefix[r] - prefix[l - 1]`.
```

```stdin
5
3 1 4 1 5
4
1 5
2 4
3 3
1 1
```

```expected
14
6
4
3
```

```stdin
3
-1000000000 -1000000000 -1000000000
2
1 3
2 3
```

```expected hidden
-3000000000
-2000000000
```

```checks
must partial_sum|inclusive_scan :: Build the prefix sums with std::partial_sum.
```
:::

:::exercise GCD and LCM of a list
Read `n` positive integers (`n >= 1`) and print the greatest common divisor and the least common
multiple of **all** of them. Fold the list with `std::accumulate`, using lambdas that call
`std::gcd` and `std::lcm`.

**Input:** `n`, then `n` positive integers. The LCM fits in a `long long`.
**Output:** `gcd G lcm L` followed by a newline.

```cpp starter
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;

    std::cout << "gcd " << v[0] << " lcm " << v[0] << '\n';
}
```

```cpp solution
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;

    long long g = std::accumulate(v.begin(), v.end(), 0LL,
                                  [](long long a, long long b) { return std::gcd(a, b); });
    long long l = std::accumulate(v.begin(), v.end(), 1LL,
                                  [](long long a, long long b) { return std::lcm(a, b); });

    std::cout << "gcd " << g << " lcm " << l << '\n';
}
```

```hint
Good starting values: `gcd(0, x)` is `x`, and `lcm(1, x)` is `x`. So start the gcd fold at `0LL` and
the lcm fold at `1LL`.
```

```hint
`std::accumulate(v.begin(), v.end(), 0LL, [](long long a, long long b) { return std::gcd(a, b); })`
```

```stdin
3
12 18 30
```

```expected
gcd 6 lcm 180
```

```stdin
1
7
```

```expected
gcd 7 lcm 7
```

```stdin
4
1000000 999999 7 13
```

```expected hidden
gcd 1 lcm 999999000000
```

```checks
must std::gcd :: Use std::gcd.
must std::lcm :: Use std::lcm.
must accumulate|reduce :: Fold the list with std::accumulate.
```
:::
