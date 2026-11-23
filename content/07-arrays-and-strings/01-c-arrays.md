---
title: C-Style Arrays
summary: Fixed-size sequences of values. Every way to declare and initialize them, indexing, looping, out-of-bounds bugs, and why they can't be copied.
---

## Many values, one name

Suppose you need the temperatures for every day of a week. Seven variables `t0`, `t1`, ... `t6`
would be painful, and impossible to loop over. An **array** stores a fixed number of values of the
same type, side by side in memory, under one name. You pick out an element by its **index**.

```cpp run
#include <iostream>

int main() {
    int temps[7] = {21, 23, 19, 18, 25, 27, 22};

    std::cout << "Monday: " << temps[0] << '\n';   // first element: index 0
    std::cout << "Sunday: " << temps[6] << '\n';   // last element: index 6 (size - 1)

    temps[2] = 20;                                 // elements are ordinary variables
    temps[3] += 1;
    std::cout << temps[2] << ' ' << temps[3] << '\n';
}
```

```output
Monday: 21
Sunday: 22
20 19
```

The syntax `int temps[7]` means "an array of 7 `int`s named `temps`". Indexes start at **0**, so a
7-element array has indexes `0` through `6`. This is the C-style (or "built-in") array; the next
lessons cover the safer `std::array` and `std::vector`, but you'll see C arrays everywhere, so learn
them well.

## Every way to declare and initialize

```cpp run
#include <iostream>

int main() {
    int a[5];                      // 5 ints, NOT initialized (garbage values, if local)
    int b[5] = {1, 2, 3, 4, 5};    // all five given
    int c[5] = {1, 2};             // the rest are zero: {1, 2, 0, 0, 0}
    int d[5] = {};                 // all zero
    int e[5]{};                    // all zero (brace initialization, no =)
    int f[]  = {7, 8, 9};          // size deduced from the initializer: 3
    int g[3]{4, 5, 6};             // brace initialization with values
    double h[4] = {0.5};           // {0.5, 0.0, 0.0, 0.0}

    a[0] = 42;                     // fine to assign before reading
    std::cout << a[0] << ' ' << b[4] << ' ' << c[3] << ' ' << d[0] << ' '
              << e[4] << ' ' << f[2] << ' ' << g[1] << ' ' << h[1] << '\n';
}
```

```output
42 5 0 0 0 9 5 0
```

Key points:

- **`int a[5];` inside a function leaves the elements uninitialized.** Reading one before writing
  it is undefined behavior. (Global and `static` arrays are zero-initialized.)
- If you give **fewer** initializers than the size, the rest are **zero**. So `= {}` and `{}` are the
  standard ways to zero an array.
- Giving **more** initializers than the size is a compile error.
- With `[]` and an initializer list, the compiler counts the elements for you.

```cpp compile-error
int main() {
    int a[3] = {1, 2, 3, 4};   // error: too many initializers for 'int [3]'
}
```

> **Pitfall:** `int c[5] = {1};` sets the **first** element to 1 and the rest to 0. It does not fill
> the array with 1s. Use a loop (or `std::array::fill`, next lessons) for that.

### The size must be a constant

The size is part of the array's type and must be known **at compile time**: a literal, a
`constexpr` constant, or a constant expression.

```cpp
constexpr int kDays = 7;
int temps[kDays];          // OK

int n;
std::cin >> n;
int data[n];               // NOT standard C++ (a "variable-length array")
```

GCC accepts `int data[n];` as an extension, but it's not portable C++ and can easily overflow the
stack. When the size is only known at run time, use `std::vector` (two lessons from now).

## Size of an array: `std::size`

`std::size(arr)` (C++17, available via `<iterator>`, `<array>`, `<string>` and other standard
headers) gives the number of elements. It's computed at compile time and returns an unsigned
`std::size_t`. In older code you'll see the `sizeof` trick instead:

```cpp run
#include <iostream>
#include <iterator>

int main() {
    double prices[] = {9.99, 4.5, 12.0, 3.25};

    std::cout << std::size(prices) << '\n';                    // 4
    std::cout << sizeof(prices) / sizeof(prices[0]) << '\n';   // total bytes / bytes per element = 4
}
```

```output
4
4
```

## Looping over an array

The classic index loop, and the range-based `for`:

```cpp run
#include <iostream>
#include <iterator>

int main() {
    int scores[] = {90, 72, 85, 64};

    // index loop: when you need the index, or want to modify elements
    for (std::size_t i = 0; i < std::size(scores); ++i) {
        std::cout << "scores[" << i << "] = " << scores[i] << '\n';
    }

    // range-for, by reference to modify every element
    for (int& s : scores) {
        s += 5;
    }

    // range-for, by value to read
    int total = 0;
    for (int s : scores) {
        total += s;
    }
    std::cout << "total after curve: " << total << '\n';
}
```

```output
scores[0] = 90
scores[1] = 72
scores[2] = 85
scores[3] = 64
total after curve: 331
```

Using `std::size_t` (unsigned) for the index avoids a signed/unsigned comparison warning against
`std::size(...)`. Plain `int i` with a `constexpr int` size is also fine.

### Reading into an array

```cpp
int values[5];
for (int i = 0; i < 5; ++i) {
    std::cin >> values[i];      // each element is an ordinary int variable
}
```

## Out of bounds: undefined behavior

C++ does **not** check indexes. `scores[4]` on a 4-element array, or `scores[-1]`, reads or writes
memory that belongs to something else. That's **undefined behavior**: it might print garbage, crash,
silently corrupt another variable, or appear to work.

```cpp
int a[3] = {1, 2, 3};
a[3] = 10;              // UB: valid indexes are 0, 1, 2
for (int i = 0; i <= 3; ++i) { /* ... a[i] ... */ }   // classic off-by-one: <= should be <
```

GCC can sometimes warn (`array subscript 3 is above array bounds`), but usually it can't know. The
off-by-one `<=` is the most common array bug there is. `std::array::at()` and `std::vector::at()`
(coming soon) check bounds for you.

## Arrays can't be assigned or copied

Unlike `int` or `std::string`, a C array can't be assigned to another array, initialized from
another array, or returned from a function:

```cpp compile-error
int main() {
    int a[3] = {1, 2, 3};
    int b[3];
    b = a;            // error: invalid array assignment
    int c[3] = a;     // error: array must be initialized with a brace-enclosed initializer
}
```

To copy, loop over the elements (or use `std::array`, which *can* be copied). Comparing two arrays
with `==` doesn't compare their contents either: it compares their addresses, which is never what
you want (C++20 deprecates it and GCC warns).

## Passing arrays to functions: decay

As you saw in the functions module, an array passed to a function **decays** to a pointer to its
first element. The function can't know the size, so you pass it separately. Inside the function,
`std::size` no longer works, and `sizeof` gives the size of a pointer:

```cpp run
#include <iostream>
#include <iterator>

int sum(const int values[], std::size_t count) {   // really: const int* values
    int total = 0;
    for (std::size_t i = 0; i < count; ++i) {
        total += values[i];
    }
    return total;
}

void fill(int values[], std::size_t count, int value) {   // modifies the caller's array
    for (std::size_t i = 0; i < count; ++i) {
        values[i] = value;
    }
}

int main() {
    int data[6];
    fill(data, std::size(data), 7);
    std::cout << sum(data, std::size(data)) << '\n';
}
```

```output
42
```

Because there's no copy, a function receiving an array **can modify the caller's elements**. Add
`const` when it only reads.

> **Tip:** Passing a pointer plus a count is error-prone (pass the wrong count and you read out of
> bounds). Modern C++ prefers `std::array` or `std::vector` by reference, or `std::span` (C++20), a
> view that carries both pointer and size.

:::quiz
After `int a[5] = {3};`, what does `a` contain?

- [ ] `{3, 3, 3, 3, 3}`
- [x] `{3, 0, 0, 0, 0}`
- [ ] `{3}` followed by four garbage values
- [ ] It doesn't compile

Missing initializers are zero-filled. Only the first element is set to 3.
:::

:::quiz
`int a[4];` What are the valid indexes?

- [ ] 1 to 4
- [x] 0 to 3
- [ ] 0 to 4
- [ ] any non-negative number

An array of size N has indexes 0 through N-1. `a[4]` is out of bounds (undefined behavior).
:::

:::quiz
Which lines compile? (select all that apply)

- [x] `int a[] = {1, 2, 3};`
- [ ] `int b[2] = {1, 2, 3};`
- [x] `int c[10]{};`
- [ ] `int d[3] = {1, 2, 3}; int e[3] = d;`

Too many initializers is an error, and arrays can't be copy-initialized from another array.
:::

:::exercise Reverse five
Read exactly 5 integers into an array, then print them in reverse order on one line, separated by
single spaces.

**Input:** 5 integers.
**Output:** the integers in reverse order, separated by spaces, then a newline.

```cpp starter
#include <iostream>

int main() {
    // declare an array of 5 ints and read into it
}
```

```cpp solution
#include <iostream>

int main() {
    int values[5];
    for (int i = 0; i < 5; ++i) {
        std::cin >> values[i];
    }
    for (int i = 4; i >= 0; --i) {
        std::cout << values[i];
        if (i > 0) std::cout << ' ';
    }
    std::cout << '\n';
}
```

```hint
Read with `for (int i = 0; i < 5; ++i) std::cin >> values[i];`, then loop from index 4 down to 0.
```

```stdin
1 2 3 4 5
```

```expected
5 4 3 2 1
```

```stdin
-1 0 0 7 -1
```

```expected hidden
-1 7 0 0 -1
```

```checks
must int\s+\w+\s*\[\s*5\s*\] :: Store the numbers in an int array of size 5.
mustnot vector|std::array :: Use a C-style array for this one.
```
:::

:::exercise Digit histogram
Read a sequence of digits (integers from 0 to 9) until the end of input and count how often each
digit occurs, using a **zero-initialized** array `int counts[10]{}`. Then print one line per digit
that occurred at least once, in increasing order: `D: COUNT`.

**Input:** zero or more integers, each between 0 and 9.
**Output:** a line `D: COUNT` for every digit with a non-zero count. Nothing if the input is empty.

```cpp starter
#include <iostream>

int main() {
    int d;
    while (std::cin >> d) {
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int counts[10]{};
    int d;
    while (std::cin >> d) {
        ++counts[d];
    }
    for (int digit = 0; digit < 10; ++digit) {
        if (counts[digit] > 0) {
            std::cout << digit << ": " << counts[digit] << '\n';
        }
    }
}
```

```hint
Use the digit itself as the index: `++counts[d];`
```

```stdin
3 1 3 9 3 0
```

```expected
0: 1
1: 1
3: 3
9: 1
```

```stdin
```

```expected hidden
```

```stdin
7 7 7 7
```

```expected hidden
7: 4
```

```checks
must int\s+counts\s*\[\s*10\s*\]\s*(\{\s*\}|=\s*\{\s*0?\s*\}) :: Declare a zero-initialized array: int counts[10]{};
```
:::

:::exercise Largest and where
Read a count `n` (1 to 100), then `n` integers into an array `int values[100]`. Write a function
`int indexOfMax(const int values[], int count)` that returns the index of the **first** largest
element. Print the largest value and its index.

**Input:** `n`, then `n` integers.
**Output:** `max V at index I`, then a newline.

```cpp starter
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int values[100];
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }
}
```

```cpp solution
#include <iostream>

int indexOfMax(const int values[], int count) {
    int best = 0;
    for (int i = 1; i < count; ++i) {
        if (values[i] > values[best]) {
            best = i;
        }
    }
    return best;
}

int main() {
    int n;
    std::cin >> n;
    int values[100];
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }
    int at = indexOfMax(values, n);
    std::cout << "max " << values[at] << " at index " << at << '\n';
}
```

```hint
Track the *index* of the best element so far, starting at 0, and compare `values[i] > values[best]`.
```

```hint
Use `>` rather than `>=` so ties keep the first index.
```

```stdin
5
3 9 2 9 1
```

```expected
max 9 at index 1
```

```stdin
1
-42
```

```expected hidden
max -42 at index 0
```

```stdin
4
-5 -2 -9 -2
```

```expected hidden
max -2 at index 1
```

```checks
must int\s+indexOfMax\s*\(\s*const\s+int\s+\w+\s*\[\s*\]\s*,\s*int :: Write int indexOfMax(const int values[], int count).
```
:::

:::exercise Rotate left
Read `n` (1 to 50), then `n` integers, then `k` (0 or more). Rotate the array **left** by `k`
positions in place (element at index `k % n` becomes the first) and print it. For example, rotating
`1 2 3 4 5` left by 2 gives `3 4 5 1 2`.

**Input:** `n`, `n` integers, then `k`.
**Output:** the rotated array, separated by single spaces, then a newline.

```cpp starter
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int a[50];
    for (int i = 0; i < n; ++i) {
        std::cin >> a[i];
    }
    int k;
    std::cin >> k;
    for (int i = 0; i < n; ++i) {
        std::cout << a[i] << (i + 1 < n ? " " : "\n");
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int a[50];
    for (int i = 0; i < n; ++i) {
        std::cin >> a[i];
    }
    int k;
    std::cin >> k;
    k %= n;

    int rotated[50];
    for (int i = 0; i < n; ++i) {
        rotated[i] = a[(i + k) % n];
    }
    for (int i = 0; i < n; ++i) {
        a[i] = rotated[i];          // arrays can't be assigned, so copy element by element
    }

    for (int i = 0; i < n; ++i) {
        std::cout << a[i] << (i + 1 < n ? " " : "\n");
    }
}
```

```hint
Element `i` of the result is element `(i + k) % n` of the original.
```

```hint
Build the result in a second array, then copy it back with a loop (`a = rotated;` won't compile).
```

```stdin
5
1 2 3 4 5
2
```

```expected
3 4 5 1 2
```

```stdin
3
7 8 9
0
```

```expected hidden
7 8 9
```

```stdin
4
1 2 3 4
6
```

```expected hidden
3 4 1 2
```
:::
