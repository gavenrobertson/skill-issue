---
title: std::vector Basics
summary: The go-to container. A resizable array that grows as you add elements. Creating, adding, removing, accessing, looping, 2D vectors and passing them around.
---

## An array that can grow

C arrays and `std::array` have a size fixed at compile time. Very often you don't know how many
values you'll have until the program runs: "read numbers until the input ends". **`std::vector`**
(from `<vector>`) is a resizable array: it starts with however many elements you like and **grows**
when you add more, managing the memory for you.

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers;          // empty: size 0

    numbers.push_back(10);             // add to the end
    numbers.push_back(20);
    numbers.push_back(30);

    std::cout << "size: " << numbers.size() << '\n';
    std::cout << numbers[0] << ' ' << numbers[2] << '\n';

    for (int n : numbers) {
        std::cout << n << ' ';
    }
    std::cout << '\n';
}
```

```output
size: 3
10 30
10 20 30
```

`std::vector` is the container you'll use most in C++. When in doubt, use a vector.

## Every way to create one

```cpp run
#include <iostream>
#include <string>
#include <vector>

void show(const std::vector<int>& v) {
    std::cout << "size " << v.size() << ":";
    for (int x : v) {
        std::cout << ' ' << x;
    }
    std::cout << '\n';
}

int main() {
    std::vector<int> a;                  // empty
    std::vector<int> b{1, 2, 3};         // these three elements
    std::vector<int> c = {4, 5};         // same, with =
    std::vector<int> d(4);               // 4 elements, value-initialized: all 0
    std::vector<int> e(3, 7);            // 3 elements, all 7
    std::vector f{1.5, 2.5};             // C++17: deduces std::vector<double>
    std::vector<int> g = b;              // copy of b
    std::vector<std::string> h(2, "hi"); // 2 strings, both "hi"

    show(a); show(b); show(c); show(d); show(e); show(g);
    std::cout << f.size() << ' ' << h[1] << '\n';
}
```

```output
size 0:
size 3: 1 2 3
size 2: 4 5
size 4: 0 0 0 0
size 3: 7 7 7
size 3: 1 2 3
2 hi
```

> **Pitfall:** Braces and parentheses mean different things for vectors!
> `std::vector<int> v(5);` is **five zeros**, but `std::vector<int> v{5};` is **one element, 5**.
> `v(3, 7)` is three 7s, but `v{3, 7}` is the two elements 3 and 7. With braces, the compiler prefers
> the "list of elements" meaning whenever it can.

Unlike a plain `int x;`, a vector's elements are **never** left uninitialized: `std::vector<int> d(4)`
really is four zeros.

## Adding and removing elements

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};

    v.push_back(4);          // add at the end: 1 2 3 4
    v.pop_back();            // remove the last element: 1 2 3
    v.pop_back();            // 1 2
    std::cout << v.size() << ' ' << v.back() << '\n';

    v.resize(5);             // grow to 5, new elements are 0: 1 2 0 0 0
    v.resize(6, 9);          // grow to 6, new element is 9: 1 2 0 0 0 9
    v.resize(3);             // shrink to 3: 1 2 0
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';

    std::cout << std::boolalpha << v.empty() << '\n';
    v.clear();               // remove everything: size 0
    std::cout << v.size() << ' ' << v.empty() << '\n';
}
```

```output
2 2
1 2 0
false
0 true
```

| Member | What it does |
| --- | --- |
| `v.push_back(x)` | append `x` at the end (size grows by 1) |
| `v.pop_back()` | remove the last element (**UB if empty**) |
| `v.size()` | number of elements (a `std::size_t`) |
| `v.empty()` | `true` if the size is 0 |
| `v.clear()` | remove all elements |
| `v.resize(n)` / `v.resize(n, x)` | grow (filling with 0 or `x`) or shrink to exactly `n` elements |
| `v[i]` | element `i`, unchecked |
| `v.at(i)` | element `i`, checked (throws `std::out_of_range`) |
| `v.front()` / `v.back()` | first / last element (**UB if empty**) |

Inserting and erasing in the middle, `reserve`, `emplace_back` and the rest come in the STL module.

## Reading an unknown number of values

The pattern you'll write a thousand times: read until input runs out, `push_back` each value.

```cpp
std::vector<int> values;
int x;
while (std::cin >> x) {
    values.push_back(x);
}
// values.size() is how many numbers were read
```

## Accessing elements safely

`[]` doesn't check bounds (UB if wrong, just like arrays). `.at()` does. And `front()`, `back()` and
`pop_back()` on an **empty** vector are undefined behavior, so check `empty()` first.

> **Warning:** `v.size()` is **unsigned**. On an empty vector, `v.size() - 1` is not -1 but a huge
> number (about 18 quintillion), so `for (std::size_t i = 0; i < v.size() - 1; ++i)` runs wild.
> Write `i + 1 < v.size()` instead.

## Looping

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{3, 1, 4, 1, 5};

    for (std::size_t i = 0; i < v.size(); ++i) {   // index loop
        std::cout << i << ':' << v[i] << ' ';
    }
    std::cout << '\n';

    for (int& x : v) {                             // modify via reference
        x *= 10;
    }

    for (int x : v) {                              // read
        std::cout << x << ' ';
    }
    std::cout << '\n';

    for (std::size_t i = v.size(); i-- > 0;) {     // backwards with an unsigned index
        std::cout << v[i] << ' ';
    }
    std::cout << '\n';
}
```

```output
0:3 1:1 2:4 3:1 4:5
30 10 40 10 50
50 10 40 10 30
```

The backwards loop looks odd: `i-- > 0` tests `i` and then decrements it, so the body sees
`size-1` down to `0`. With `int i = v.size() - 1; i >= 0` you'd need a cast and risk the unsigned trap.

> **Pitfall:** Don't `push_back` into a vector while you're range-for looping over it. Growing may
> move all the elements to new memory, and the loop would keep reading the old (freed) memory: UB.

## Copying and comparing

Vectors are values, like `std::array`: `=` copies all the elements, and `==`/`<` compare contents.

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 3};
    std::vector<int> b = a;    // independent copy
    b.push_back(4);

    std::cout << a.size() << ' ' << b.size() << '\n';
    std::cout << std::boolalpha << (a == b) << ' ' << (a < b) << '\n';
}
```

```output
3 4
false true
```

## Passing vectors to functions

Copying a vector copies **every element**, so:

- read-only: pass by `const std::vector<T>&`,
- modify the caller's vector: pass by `std::vector<T>&`,
- build a new one: **return** it by value (cheap: it's moved, not copied).

```cpp run
#include <iostream>
#include <vector>

double average(const std::vector<double>& values) {
    if (values.empty()) {
        return 0.0;
    }
    double sum = 0.0;
    for (double v : values) {
        sum += v;
    }
    return sum / values.size();
}

void addBonus(std::vector<double>& values, double bonus) {
    for (double& v : values) {
        v += bonus;
    }
}

std::vector<int> range(int from, int to) {
    std::vector<int> result;
    for (int i = from; i <= to; ++i) {
        result.push_back(i);
    }
    return result;
}

int main() {
    std::vector<double> grades{70, 80, 90};
    addBonus(grades, 5);
    std::cout << average(grades) << '\n';

    for (int x : range(3, 6)) {
        std::cout << x << ' ';
    }
    std::cout << '\n';
}
```

```output
85
3 4 5 6
```

Unlike `std::array`, the size isn't part of the type, so one function handles vectors of any length.

## 2D vectors

A vector of vectors makes a grid whose size is chosen at run time. Rows can even have different
lengths ("jagged"):

```cpp run
#include <iostream>
#include <vector>

int main() {
    int rows = 3;
    int cols = 4;
    std::vector<std::vector<int>> grid(rows, std::vector<int>(cols, 0));   // 3x4 zeros

    grid[1][2] = 5;
    std::cout << grid.size() << "x" << grid[0].size() << ", grid[1][2] = " << grid[1][2] << '\n';

    std::vector<std::vector<int>> triangle;   // jagged: row i has i+1 elements
    for (int i = 0; i < 4; ++i) {
        triangle.push_back(std::vector<int>(i + 1, i));
    }
    for (const auto& row : triangle) {
        for (int x : row) {
            std::cout << x << ' ';
        }
        std::cout << '\n';
    }
}
```

```output
3x4, grid[1][2] = 5
0
1 1
2 2 2
3 3 3 3
```

:::quiz
What does `std::vector<int> v(3, 5);` contain?

- [ ] `{3, 5}`
- [x] `{5, 5, 5}`
- [ ] `{3, 3, 3, 3, 3}`
- [ ] `{0, 0, 0}`

`(count, value)`: three copies of 5. With braces, `{3, 5}` would be the two elements 3 and 5.
:::

:::quiz
Which of these are undefined behavior on an **empty** `std::vector<int> v`? (select all that apply)

- [x] `v.back()`
- [x] `v.pop_back()`
- [ ] `v.size()`
- [x] `v[0]`
- [ ] `v.push_back(1)`

Accessing or removing elements that don't exist is UB. `size()` returns 0, and `push_back` works on any vector.
:::

:::exercise Collect and reverse {easy}
Read integers until the end of input into a `std::vector<int>` using `push_back`. Print how many
there were, then the numbers in reverse order on one line separated by spaces. If there were none,
print only `count: 0`.

**Input:** zero or more integers.
**Output:** `count: N`, then (if `N > 0`) the numbers in reverse order.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    std::cout << "count: " << values.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    int x;
    while (std::cin >> x) {
        values.push_back(x);
    }
    std::cout << "count: " << values.size() << '\n';
    if (!values.empty()) {
        for (std::size_t i = values.size(); i-- > 0;) {
            std::cout << values[i] << (i > 0 ? " " : "\n");
        }
    }
}
```

```hint
`while (std::cin >> x) values.push_back(x);`
```

```hint
To go backwards safely with an unsigned index: `for (std::size_t i = values.size(); i-- > 0;)`.
```

```stdin
1 2 3 4
```

```expected
count: 4
4 3 2 1
```

```stdin
```

```expected
count: 0
```

```stdin
42
```

```expected hidden
count: 1
42
```

```stdin
-1 0
-1
```

```expected hidden
count: 3
-1 0 -1
```

```checks
must push_back :: Add the numbers with push_back.
```
:::

:::exercise Keep the evens {easy}
Write `std::vector<int> evens(const std::vector<int>& values)` that returns a **new** vector with only
the even numbers, in their original order. Read numbers until the end of input, then print the
result separated by spaces, or `none` if there are no even numbers.

**Input:** zero or more integers.
**Output:** the even numbers on one line, or `none`.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    int x;
    while (std::cin >> x) {
        values.push_back(x);
    }
    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>
#include <vector>

std::vector<int> evens(const std::vector<int>& values) {
    std::vector<int> result;
    for (int v : values) {
        if (v % 2 == 0) {
            result.push_back(v);
        }
    }
    return result;
}

int main() {
    std::vector<int> values;
    int x;
    while (std::cin >> x) {
        values.push_back(x);
    }
    std::vector<int> e = evens(values);
    if (e.empty()) {
        std::cout << "none\n";
        return 0;
    }
    for (std::size_t i = 0; i < e.size(); ++i) {
        std::cout << e[i] << (i + 1 < e.size() ? " " : "\n");
    }
}
```

```hint
Negative even numbers have `v % 2 == 0` too (`-4 % 2` is `0`), so that test works for all integers.
```

```stdin
1 2 3 4 5 6
```

```expected
2 4 6
```

```stdin
1 3 5
```

```expected
none
```

```stdin
-4 0 7 -3 8
```

```expected hidden
-4 0 8
```

```stdin
```

```expected hidden
none
```

```checks
must std::vector\s*<\s*int\s*>\s+evens\s*\(\s*const\s+std::vector\s*<\s*int\s*>\s*&\s*\w+\s*\) :: Write std::vector<int> evens(const std::vector<int>& values).
```
:::

:::exercise Stack machine {medium}
Use a `std::vector<int>` as a **stack** (last in, first out). Process commands until the end of input:

- `push X` adds `X` on top (`push_back`).
- `pop` removes the top element, or prints `error: empty` if there is none.
- `top` prints the top element (`back()`), or `error: empty`.
- `size` prints the number of elements.

**Input:** one command per line.
**Output:** one line for each `top`, `size`, or failed `pop`.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> stack;
    std::string command;
    while (std::cin >> command) {
        if (command == "push") {
            int x;
            std::cin >> x;
        }
    }
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> stack;
    std::string command;
    while (std::cin >> command) {
        if (command == "push") {
            int x;
            std::cin >> x;
            stack.push_back(x);
        } else if (command == "pop") {
            if (stack.empty()) {
                std::cout << "error: empty\n";
            } else {
                stack.pop_back();
            }
        } else if (command == "top") {
            if (stack.empty()) {
                std::cout << "error: empty\n";
            } else {
                std::cout << stack.back() << '\n';
            }
        } else if (command == "size") {
            std::cout << stack.size() << '\n';
        }
    }
}
```

```hint
Always check `stack.empty()` before calling `back()` or `pop_back()`: both are UB on an empty vector.
```

```stdin
push 1
push 2
top
pop
top
size
```

```expected
2
1
1
```

```stdin
pop
top
size
push 5
push 6
pop
pop
pop
size
```

```expected hidden
error: empty
error: empty
0
error: empty
0
```

```stdin
push -3
push 0
size
top
pop
top
pop
pop
top
push 7
top
size
```

```expected hidden
2
0
-3
error: empty
error: empty
7
1
```

```checks
must pop_back :: Remove elements with pop_back.
must \.back\s*\(\s*\) :: Read the top element with back().
must \.empty\s*\(\s*\) :: Check empty() before back() / pop_back().
```
:::

:::exercise Pascal's triangle {medium}
Read `n` (1 to 20) and build the first `n` rows of Pascal's triangle in a
`std::vector<std::vector<long long>>`. Row `i` has `i + 1` numbers; the first and last are 1, and every
other number is the sum of the two numbers above it. Print each row with numbers separated by single
spaces.

**Input:** one integer `n`.
**Output:** `n` lines.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
}
```

```cpp solution
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<std::vector<long long>> rows;
    for (int i = 0; i < n; ++i) {
        std::vector<long long> row(i + 1, 1);
        for (int j = 1; j < i; ++j) {
            row[j] = rows[i - 1][j - 1] + rows[i - 1][j];
        }
        rows.push_back(row);
    }
    for (const auto& row : rows) {
        for (std::size_t j = 0; j < row.size(); ++j) {
            std::cout << row[j] << (j + 1 < row.size() ? " " : "\n");
        }
    }
}
```

```hint
Start each row as `std::vector<long long> row(i + 1, 1);` so the ends are already 1.
```

```hint
Fill the middle with `row[j] = rows[i - 1][j - 1] + rows[i - 1][j];`, then `push_back` the row.
```

```stdin
5
```

```expected
1
1 1
1 2 1
1 3 3 1
1 4 6 4 1
```

```stdin
1
```

```expected hidden
1
```

```stdin
2
```

```expected hidden
1
1 1
```

```stdin
20
```

```expected hidden
1
1 1
1 2 1
1 3 3 1
1 4 6 4 1
1 5 10 10 5 1
1 6 15 20 15 6 1
1 7 21 35 35 21 7 1
1 8 28 56 70 56 28 8 1
1 9 36 84 126 126 84 36 9 1
1 10 45 120 210 252 210 120 45 10 1
1 11 55 165 330 462 462 330 165 55 11 1
1 12 66 220 495 792 924 792 495 220 66 12 1
1 13 78 286 715 1287 1716 1716 1287 715 286 78 13 1
1 14 91 364 1001 2002 3003 3432 3003 2002 1001 364 91 14 1
1 15 105 455 1365 3003 5005 6435 6435 5005 3003 1365 455 105 15 1
1 16 120 560 1820 4368 8008 11440 12870 11440 8008 4368 1820 560 120 16 1
1 17 136 680 2380 6188 12376 19448 24310 24310 19448 12376 6188 2380 680 136 17 1
1 18 153 816 3060 8568 18564 31824 43758 48620 43758 31824 18564 8568 3060 816 153 18 1
1 19 171 969 3876 11628 27132 50388 75582 92378 92378 75582 50388 27132 11628 3876 969 171 19 1
```

```checks
must std::vector\s*<\s*std::vector\s*< :: Store the triangle in a vector of vectors.
```
:::

:::exercise Matrix product {hard}
Read two matrices `A` and `B` into 2D vectors and print their product `A × B`. The product is only
defined when `A` has as many **columns** as `B` has **rows**; otherwise print `dimension mismatch`.

If `A` is `r1 × c1` and `B` is `c1 × c2`, the product `C` is `r1 × c2`, and each entry is a row of `A`
"dotted" with a column of `B`:

```
C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + ... + A[i][c1 - 1] * B[c1 - 1][j]
```

Write a function `std::vector<std::vector<long long>> multiply(const std::vector<std::vector<long long>>& a,
const std::vector<std::vector<long long>>& b)` that returns the product.

**Input:** `r1 c1`, then `r1` lines of `c1` integers (matrix `A`), then `r2 c2` and `r2` lines of `c2`
integers (matrix `B`). All dimensions are between 1 and 10, and entries are between -1000000 and
1000000 (so products need `long long`).
**Output:** `r1` lines with `c2` numbers each, separated by single spaces, or `dimension mismatch`.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int r1, c1;
    std::cin >> r1 >> c1;
}
```

```cpp solution
#include <iostream>
#include <vector>

std::vector<std::vector<long long>> readMatrix() {
    int rows, cols;
    std::cin >> rows >> cols;
    std::vector<std::vector<long long>> m(rows, std::vector<long long>(cols));
    for (auto& row : m) {
        for (long long& x : row) {
            std::cin >> x;
        }
    }
    return m;
}

std::vector<std::vector<long long>> multiply(const std::vector<std::vector<long long>>& a,
                                             const std::vector<std::vector<long long>>& b) {
    std::size_t rows = a.size();
    std::size_t inner = b.size();          // == a[0].size()
    std::size_t cols = b[0].size();
    std::vector<std::vector<long long>> c(rows, std::vector<long long>(cols, 0));
    for (std::size_t i = 0; i < rows; ++i) {
        for (std::size_t j = 0; j < cols; ++j) {
            for (std::size_t k = 0; k < inner; ++k) {
                c[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    return c;
}

int main() {
    std::vector<std::vector<long long>> a = readMatrix();
    std::vector<std::vector<long long>> b = readMatrix();
    if (a[0].size() != b.size()) {
        std::cout << "dimension mismatch\n";
        return 0;
    }
    for (const auto& row : multiply(a, b)) {
        for (std::size_t j = 0; j < row.size(); ++j) {
            std::cout << row[j] << (j + 1 < row.size() ? " " : "\n");
        }
    }
}
```

```hint
Read a matrix with `std::vector<std::vector<long long>> m(rows, std::vector<long long>(cols));` and a
nested loop. Writing a small `readMatrix()` function lets you read both matrices the same way.
```

```hint
The check is `columns of A == rows of B`, i.e. `a[0].size() == b.size()`. The result has `a.size()` rows
and `b[0].size()` columns.
```

```hint
Three nested loops: `i` over the rows of `A`, `j` over the columns of `B`, and `k` over the shared
dimension, accumulating `a[i][k] * b[k][j]`.
```

```stdin
2 3
1 2 3
4 5 6
3 2
7 8
9 10
11 12
```

```expected
58 64
139 154
```

```stdin
2 3
1 2 3
4 5 6
2 3
1 2 3
4 5 6
```

```expected
dimension mismatch
```

```stdin
1 2
1 -1
2 3
1 2 3
4 5 6
```

```expected hidden
-3 -3 -3
```

```stdin
2 3
1 0 0
0 1 0
2 2
1 2
3 4
```

```expected hidden
dimension mismatch
```

```stdin
3 1
1
2
3
1 3
-1 0 1
```

```expected hidden
-1 0 1
-2 0 2
-3 0 3
```

```stdin
1 1
1000000
1 1
-1000000
```

```expected hidden
-1000000000000
```

```stdin
1 3
1000000 1000000 1000000
3 1
1000000
1000000
1000000
```

```expected hidden
3000000000000
```

```checks
must std::vector\s*<\s*std::vector\s*<\s*long\s+long\s*>\s*>\s+multiply\s*\( :: Write std::vector<std::vector<long long>> multiply(...) returning the product.
```
:::
