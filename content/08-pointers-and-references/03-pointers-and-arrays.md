---
title: Pointers & Arrays
summary: Array-to-pointer decay, pointer arithmetic, why p[i] is *(p + i), walking arrays with begin/end pointers, and passing arrays to functions.
---

Pointers and C-style arrays are deeply connected. Understanding the connection explains why arrays
behave strangely when passed to functions, and it's how iterators (which you'll use all over the
standard library) work under the hood.

## Array-to-pointer decay

In almost every expression, the name of a C array **automatically converts to a pointer to its first
element**. This is called **decay**:

```cpp run
#include <iostream>

int main() {
    int numbers[4]{10, 20, 30, 40};

    int* p = numbers;          // decay: same as int* p = &numbers[0];

    std::cout << *p << '\n';                       // 10
    std::cout << (p == &numbers[0]) << '\n';       // 1 (true)
    std::cout << sizeof numbers << ' ' << sizeof p << '\n';   // 16 vs 8
}
```

```output
10
1
16 8
```

The last line shows what decay *loses*: `sizeof numbers` is the whole array (4 × 4 = 16 bytes), but
`sizeof p` is just the size of a pointer. Once an array has decayed, **the size is gone**. The
pointer only knows where the first element is.

Decay does *not* happen with `sizeof`, with `&numbers` (which gives a pointer to the whole array,
type `int(*)[4]`), or when you bind the array to a reference. `std::array` and `std::vector` never
decay at all.

## Pointer arithmetic

Adding an integer to a pointer moves it by that many **elements**, not bytes. The compiler multiplies by
`sizeof(element)` for you:

```cpp run
#include <iostream>

int main() {
    int numbers[5]{10, 20, 30, 40, 50};
    int* p = numbers;            // points to numbers[0]

    std::cout << *(p + 1) << '\n';   // 20: one int further
    std::cout << *(p + 4) << '\n';   // 50

    p += 2;                          // now points to numbers[2]
    std::cout << *p << '\n';         // 30

    ++p;                             // numbers[3]
    std::cout << *p << '\n';         // 40

    p--;                             // back to numbers[2]
    std::cout << *p << '\n';         // 30

    int* last = &numbers[4];
    std::cout << last - p << '\n';   // 2: elements between them

    std::cout << (p < last) << '\n'; // 1: pointers into one array can be compared
}
```

```output
20
50
30
40
30
2
1
```

The full set of pointer arithmetic operations:

| Expression | Meaning |
| --- | --- |
| `p + n`, `n + p` | pointer `n` elements after `p` |
| `p - n` | pointer `n` elements before `p` |
| `p += n`, `p -= n` | move `p` by `n` elements |
| `++p`, `p++`, `--p`, `p--` | move by one element |
| `q - p` | number of elements between two pointers (type `std::ptrdiff_t`, a signed integer) |
| `p < q`, `p == q`, ... | compare positions in the same array |

Adding two pointers (`p + q`) is meaningless and doesn't compile:

```cpp compile-error
int main() {
    int a[3]{};
    int* p = a;
    int* q = a + 2;
    auto r = p + q;   // error: invalid operands of types 'int*' and 'int*' to binary 'operator+'
}
```

### Watch the precedence: `*p + 1` vs `*(p + 1)`

```cpp
int a[3]{10, 20, 30};
int* p = a;
*p + 1;      // 11: dereference first (10), then add 1
*(p + 1);    // 20: move one element, then dereference
*p++;        // 10, and p moves to a[1]: ++ binds tighter than *, so this is *(p++)
(*p)++;      // increments the value p points to; p doesn't move
```

## `p[i]` is just `*(p + i)`

Here's the secret: the subscript operator is **defined** in terms of pointer arithmetic. `a[i]` means
exactly `*(a + i)`. That's why indexes start at 0: the first element is zero steps from the start.

```cpp run
#include <iostream>

int main() {
    int a[3]{7, 8, 9};
    int* p = a;

    std::cout << a[1] << ' ' << *(a + 1) << ' ' << p[1] << ' ' << *(p + 1) << '\n';

    int* middle = a + 1;
    std::cout << middle[0] << ' ' << middle[1] << ' ' << middle[-1] << '\n';
}
```

```output
8 8 8 8
8 9 7
```

So you can use `[]` on any pointer, and even negative indexes are fine as long as you stay inside the
array. (Since `a[i]` is `*(a + i)` and addition is commutative, `i[a]` also compiles. Never write that.)

## Out of bounds is undefined behavior

Pointer arithmetic must stay **inside the array**. There's one exception: you may form the pointer
**one past the last element** (but never dereference it). Anything else is undefined behavior:

```cpp
int a[3]{1, 2, 3};
int* end = a + 3;    // OK: one past the end, used as a "stop here" marker
*end;                // undefined behavior: there's no element there
int* bad = a + 4;    // undefined behavior: even creating it is not allowed
a[-1];               // undefined behavior
```

C++ does no bounds checking on raw pointers or C arrays. Reading past the end doesn't raise an error;
it reads whatever happens to be in memory.

## Iterating with pointers

A loop that walks a pointer through an array:

```cpp run
#include <iostream>

int main() {
    int data[5]{3, 1, 4, 1, 5};

    // 1. index-based loop (what you know)
    for (int i = 0; i < 5; ++i) std::cout << data[i] << ' ';
    std::cout << '\n';

    // 2. pointer + count
    int* p = data;
    for (int i = 0; i < 5; ++i) std::cout << *p++ << ' ';
    std::cout << '\n';

    // 3. begin/end pointers: the idiomatic "half-open range" [begin, end)
    int* begin = data;
    int* end = data + 5;          // one past the last element
    for (int* it = begin; it != end; ++it) {
        std::cout << *it << ' ';
    }
    std::cout << '\n';

    // 4. std::begin / std::end compute those two pointers for a C array
    for (int* it = std::begin(data); it != std::end(data); ++it) {
        *it *= 10;                // pointers can modify, too
    }
    for (int x : data) std::cout << x << ' ';   // range-for uses begin/end internally
    std::cout << '\n';
}
```

```output
3 1 4 1 5
3 1 4 1 5
3 1 4 1 5
30 10 40 10 50
```

The **half-open range** `[begin, end)` is everywhere in C++: `begin` points at the first element, `end`
points *one past* the last, and the loop runs while `it != end`. An empty range is simply
`begin == end`. The standard library's iterators (`v.begin()`, `v.end()`) follow exactly this pattern,
so pointers are your first taste of iterators. Note that `std::begin`/`std::end` live in `<iterator>`
(they're also pulled in by `<iostream>`, `<vector>`, `<string>`, and most container headers).

## Passing arrays to functions

Because of decay, you **can't** pass a C array by value. A parameter that looks like an array is
silently rewritten as a pointer:

```cpp
void f(int arr[10]);   // the 10 is ignored!
void f(int arr[]);     // same thing
void f(int* arr);      // what the compiler actually sees
```

So the function has no idea how long the array is. The classic C solution is to **pass the size
separately**, or pass a begin/end pair:

```cpp run
#include <iostream>

// pointer + size
int sum(int* arr, int size) {
    int total = 0;
    for (int i = 0; i < size; ++i) {
        total += arr[i];
    }
    return total;
}

// begin/end pair
int countEven(int* begin, int* end) {
    int count = 0;
    for (int* p = begin; p != end; ++p) {
        if (*p % 2 == 0) ++count;
    }
    return count;
}

void doubleAll(int* arr, int size) {
    for (int i = 0; i < size; ++i) {
        arr[i] *= 2;      // changes the caller's array: no copy was made
    }
}

int main() {
    int values[6]{1, 2, 3, 4, 5, 6};

    std::cout << sum(values, 6) << '\n';
    std::cout << sum(values + 2, 3) << '\n';           // just values[2..4]
    std::cout << countEven(values, values + 6) << '\n';

    doubleAll(values, 6);
    std::cout << values[0] << ' ' << values[5] << '\n';
}
```

```output
21
12
3
2 12
```

Notice `sum(values + 2, 3)`: since a function only gets a pointer, you can hand it any sub-range.

> **Pitfall:** `sizeof(arr)` inside such a function gives the size of a *pointer* (8), not the array.
> GCC even warns: *"'sizeof' on array function parameter 'arr' will return size of 'int\*'"*.

> **Tip:** In modern C++, prefer `std::vector<int>&`, `std::array<int, N>&`, or `std::span<int>`
> (C++20, from `<span>`), which carry their size with them. Pointer + size is still essential to
> understand, because C libraries and older code use it everywhere.

### C strings are char arrays

A C-style string like `"hi"` is an array of `char` ending in a zero byte (`'\0'`). That terminator is
how functions know where the string ends without being told the size:

```cpp run
#include <iostream>

int length(const char* s) {
    const char* p = s;
    while (*p != '\0') {
        ++p;
    }
    return static_cast<int>(p - s);   // pointer difference = number of chars
}

int main() {
    char word[] = "pointer";   // 8 chars: p o i n t e r \0
    std::cout << length(word) << ' ' << sizeof word << '\n';
}
```

```output
7 8
```

(`const char*` means you can read but not modify the characters. That's the next lesson.)

:::quiz
Given `int a[5]{2, 4, 6, 8, 10}; int* p = a + 1;`, what is `p[2]`?

- [ ] `4`
- [ ] `6`
- [x] `8`
- [ ] `10`

`p` points at `a[1]`, so `p[2]` is `*(p + 2)`, which is `a[3]`, which is 8.
:::

:::quiz
Inside `void f(int arr[10])`, what is `sizeof(arr)` on a 64-bit system?

- [ ] `40`
- [ ] `10`
- [x] `8`
- [ ] It doesn't compile

An array parameter is really a pointer (`int* arr`), so `sizeof` gives the size of a pointer. The `10`
is ignored.
:::

:::quiz
`int* b = a; int* e = a + 5;` where `a` has 5 elements. Which statements are true? (select all that apply)

- [x] `e - b` is `5`
- [x] Creating `e` is allowed
- [ ] Reading `*e` is allowed
- [x] `for (int* it = b; it != e; ++it)` visits all 5 elements

A pointer one past the end is legal to create and compare, but not to dereference.
:::

:::exercise Sum with a pointer
Read `n` (1 to 100) and then `n` integers into a C array `int values[100]`. Compute their sum by walking
a pointer from the first element to one past the last element: don't use `[]` in the summing loop.

**Input:** `n`, then `n` integers.
**Output:** the sum, followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int values[100]{};
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }

    long long total = 0;
    // walk a pointer from values to values + n

    std::cout << total << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int values[100]{};
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }

    long long total = 0;
    for (int* p = values; p != values + n; ++p) {
        total += *p;
    }

    std::cout << total << '\n';
}
```

```hint
`int* end = values + n;` is one past the last element you read. Loop `for (int* p = values; p != end; ++p)`.
```

```stdin
4
1 2 3 4
```

```expected
10
```

```stdin
1
-7
```

```expected
-7
```

```stdin
5
1000000000 1000000000 1000000000 -5 5
```

```expected hidden
3000000000
```

```checks
must int\s*\*\s*\w+\s*=\s*values :: Start a pointer at the beginning of the array (int* p = values).
must \+\+\s*\w+\s*\)|\w+\s*\+\+\s*\) :: Advance the pointer with ++ in the loop.
must \+=\s*\*\s*\w+ :: Add the pointed-to value with total += *p.
```
:::

:::exercise Reverse in place
Read `n` (0 to 100) and `n` integers into a C array. Reverse the array **in place** using two pointers:
one starting at the first element, one at the last. Swap what they point to and move them toward each
other until they meet. Then print the array.

**Input:** `n`, then `n` integers.
**Output:** the reversed values separated by single spaces, followed by a newline (just an empty line
if `n` is 0).

```cpp starter
#include <iostream>

int main() {
    int a[100]{};
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cin >> a[i];
    }

    // reverse with two pointers

    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << a[i];
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a[100]{};
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cin >> a[i];
    }

    if (n > 0) {
        int* left = a;
        int* right = a + n - 1;
        while (left < right) {
            int temp = *left;
            *left = *right;
            *right = temp;
            ++left;
            --right;
        }
    }

    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << a[i];
    }
    std::cout << '\n';
}
```

```hint
`int* left = a;` and `int* right = a + n - 1;`. Loop while `left < right`.
```

```hint
Swap the values, not the pointers: `int t = *left; *left = *right; *right = t;`, then `++left; --right;`.
Careful with `n == 0`: `a + n - 1` would point before the array.
```

```stdin
5
1 2 3 4 5
```

```expected
5 4 3 2 1
```

```stdin
4
10 20 30 40
```

```expected
40 30 20 10
```

```stdin
1
42
```

```expected hidden
42
```

```stdin
0
```

```expected hidden

```

```checks
must int\s*\*\s*\w+\s*=\s*a\s*\+ :: Create a pointer to the last element (a + n - 1).
mustnot std::reverse|std::swap :: Do the swapping yourself with the pointers.
```
:::

:::exercise Position of the maximum
Write a function `int* findMax(int* begin, int* end)` that returns a pointer to the largest element
in the half-open range `[begin, end)` (the **first** one if there are ties). In `main`, read the
values, call it, and use **pointer subtraction** to compute the index of the maximum.

**Input:** `n` (1 to 100), then `n` integers.
**Output:** `max <value> at index <index>`, followed by a newline.

Example: `5` / `3 9 2 9 1` prints `max 9 at index 1`.

```cpp starter
#include <iostream>

int* findMax(int* begin, int* end) {
    // return a pointer to the largest element
    return end;
}

int main() {
    int values[100]{};
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }

    std::cout << "max ? at index ?\n";
}
```

```cpp solution
#include <iostream>

int* findMax(int* begin, int* end) {
    int* best = begin;
    for (int* p = begin; p != end; ++p) {
        if (*p > *best) {
            best = p;
        }
    }
    return best;
}

int main() {
    int values[100]{};
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }

    int* m = findMax(values, values + n);
    std::cout << "max " << *m << " at index " << m - values << '\n';
}
```

```hint
Keep a pointer `best` to the best element so far. Only replace it when `*p > *best` (strictly greater),
so ties keep the first one.
```

```hint
If `m` points into `values`, then `m - values` is its index.
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
-4
```

```expected
max -4 at index 0
```

```stdin
4
-10 -3 -7 -3
```

```expected hidden
max -3 at index 1
```

```stdin
3
1 2 50
```

```expected hidden
max 50 at index 2
```

```checks
must int\s*\*\s*findMax\s*\(\s*int\s*\*\s*\w+\s*,\s*int\s*\*\s*\w+\s*\) :: Keep the signature int* findMax(int* begin, int* end).
must \w+\s*-\s*values :: Compute the index with pointer subtraction (m - values).
```
:::
