---
title: std::array
summary: The fixed-size array that behaves like a normal value. It knows its size, can be copied, compared and returned, and offers bounds-checked access.
---

## A C array, but civilized

C arrays have annoying gaps: they forget their size when passed to functions, can't be copied or
assigned, and can't be returned. **`std::array`** (from `<array>`) fixes all of that with **zero
overhead**: it's a thin wrapper around a C array, exactly as fast, with the same fixed size.

```cpp run
#include <array>
#include <iostream>

int main() {
    std::array<int, 5> scores = {90, 72, 85, 64, 99};

    std::cout << "size: " << scores.size() << '\n';   // it knows its size
    std::cout << "first: " << scores[0] << '\n';      // indexing works the same
    scores[1] = 75;

    for (int s : scores) {                            // so does range-for
        std::cout << s << ' ';
    }
    std::cout << '\n';
}
```

```output
size: 5
first: 90
90 75 85 64 99
```

The type is `std::array<ElementType, Size>`. Both are part of the type: `std::array<int, 5>` and
`std::array<int, 6>` are different types. The size must be a compile-time constant, just like a C
array's.

## Every way to create one

```cpp run
#include <array>
#include <iostream>
#include <string>

int main() {
    std::array<int, 4> a;                     // NOT initialized for ints (like int a[4];)
    std::array<int, 4> b{};                   // all zero
    std::array<int, 4> c = {1, 2};           // {1, 2, 0, 0}
    std::array<int, 4> d{5, 6, 7, 8};         // brace init without =
    std::array e{1.5, 2.5, 3.5};              // C++17: type and size deduced: std::array<double, 3>
    std::array<std::string, 2> f{"hi", "yo"}; // any element type
    std::array<std::string, 3> g{};           // strings start empty anyway

    a.fill(9);                                // set every element to 9
    std::cout << a[3] << ' ' << b[0] << ' ' << c[3] << ' ' << d[2] << ' '
              << e.size() << ' ' << f[1] << ' ' << g[0].size() << '\n';
}
```

```output
9 0 0 7 3 yo 0
```

As with C arrays, too many initializers is a compile error, and the deduction form
`std::array e{...}` needs at least one element and all elements of the same type.

## Element access

| Member | What it does |
| --- | --- |
| `a[i]` | element `i`, **no** bounds check (out of range is UB) |
| `a.at(i)` | element `i`, **checked**: throws `std::out_of_range` if `i >= size()` |
| `a.front()` | first element, same as `a[0]` |
| `a.back()` | last element, same as `a[a.size() - 1]` |
| `a.size()` | number of elements (a `std::size_t`) |
| `a.empty()` | `true` only for a size-0 array |
| `a.fill(v)` | assigns `v` to every element |
| `a.data()` | pointer to the underlying C array (for C APIs) |

### `[]` vs `.at()`

`.at()` checks the index every time and **throws an exception** if it's out of range, instead of
silently reading garbage. Exceptions get their own module later; for now, know that an uncaught
exception stops the program with an error message, which is far better than undefined behavior.
Here's a sneak peek at catching one:

```cpp run
#include <array>
#include <iostream>
#include <stdexcept>

int main() {
    std::array<int, 3> a{10, 20, 30};

    std::cout << a.at(2) << '\n';        // fine
    try {
        std::cout << a.at(3) << '\n';    // out of range: throws
    } catch (const std::out_of_range&) {
        std::cout << "index 3 is out of range\n";
    }
    std::cout << a.front() << ' ' << a.back() << '\n';
}
```

```output
30
index 3 is out of range
10 30
```

Use `[]` in tight loops where the index is obviously valid (`for (std::size_t i = 0; i < a.size(); ++i)`),
and `.at()` when the index comes from outside, like user input.

## Copying, assigning, comparing

Everything C arrays couldn't do, `std::array` can:

```cpp run
#include <array>
#include <iostream>

int main() {
    std::array<int, 3> a{1, 2, 3};
    std::array<int, 3> b = a;      // copy: b is a separate array
    b[0] = 100;                    // a is unaffected

    std::array<int, 3> c{};
    c = a;                         // assignment copies every element

    std::cout << a[0] << ' ' << b[0] << ' ' << c[0] << '\n';
    std::cout << std::boolalpha;
    std::cout << (a == c) << '\n';   // element-by-element comparison
    std::cout << (a != b) << '\n';
    std::cout << (a < b) << '\n';    // lexicographic, like words in a dictionary
}
```

```output
1 100 1
true
true
true
```

`<`, `<=`, `>` and `>=` compare **lexicographically**: the first position where the arrays differ
decides (`{1, 2, 3} < {100, 2, 3}` because `1 < 100`).

Assigning or comparing arrays of different sizes doesn't compile, because they're different types:

```cpp compile-error
#include <array>

int main() {
    std::array<int, 3> a{};
    std::array<int, 4> b{};
    a = b;   // error: no match for 'operator=' (different types)
}
```

## Passing to and returning from functions

Pass by `const&` to read (copying would copy every element), by `&` to modify. The size is part of
the type, so the function knows it with `.size()`. And you can **return** a `std::array`:

```cpp run
#include <array>
#include <iostream>

void print(const std::array<int, 4>& values) {
    for (std::size_t i = 0; i < values.size(); ++i) {
        std::cout << values[i] << (i + 1 < values.size() ? ", " : "\n");
    }
}

void doubleAll(std::array<int, 4>& values) {
    for (int& v : values) {
        v *= 2;
    }
}

std::array<int, 4> squares() {
    std::array<int, 4> result{};
    for (std::size_t i = 0; i < result.size(); ++i) {
        result[i] = static_cast<int>(i * i);
    }
    return result;
}

int main() {
    std::array<int, 4> s = squares();
    print(s);
    doubleAll(s);
    print(s);
}
```

```output
0, 1, 4, 9
0, 2, 8, 18
```

A function taking `std::array<int, 4>` won't accept a `std::array<int, 5>`. To write one function for
any size you need a **template** (a later module). Until then, that limitation is a good reason to
reach for `std::vector` when sizes vary.

## Structured bindings and nesting

Small arrays can be unpacked with structured bindings, and arrays can hold arrays for grids:

```cpp run
#include <array>
#include <iostream>

int main() {
    std::array<int, 3> rgb{255, 128, 0};
    auto [r, g, b] = rgb;
    std::cout << r << ' ' << g << ' ' << b << '\n';

    std::array<std::array<int, 3>, 2> grid{{{1, 2, 3}, {4, 5, 6}}};   // 2 rows of 3
    for (const auto& row : grid) {
        for (int v : row) {
            std::cout << v << ' ';
        }
        std::cout << '\n';
    }
    std::cout << grid[1][2] << '\n';
}
```

```output
255 128 0
1 2 3
4 5 6
6
```

The extra braces in the nested initializer are a quirk: a `std::array` is a struct containing a C
array, so full bracing needs one extra pair around the whole list.

> **Tip:** Prefer `std::array` over a C array whenever the size is fixed at compile time. It costs
> nothing and removes a whole class of bugs.

:::quiz
Which of these work with `std::array<int, 3> a{1, 2, 3};` but **not** with `int c[3] = {1, 2, 3};`? (select all that apply)

- [x] `auto b = a;` making an independent copy
- [x] `a.size()`
- [ ] `a[0] = 5;`
- [x] `a == other` comparing contents

Indexing works on both. Copying, `.size()` and comparison of contents are `std::array` extras.
:::

:::quiz
What happens with `std::array<int, 3> a{}; a.at(5);`?

- [ ] Undefined behavior, like `a[5]`
- [x] It throws a `std::out_of_range` exception
- [ ] It returns 0
- [ ] It doesn't compile

`.at()` checks the index at run time and throws. `a[5]` would be undefined behavior.
:::

:::exercise Five scores {easy}
Read 5 integers into a `std::array<int, 5>`. Print the minimum, the maximum and the sum on three
lines, using `.size()` or range-for loops (no hard-coded `5` in your loops).

**Input:** 5 integers.
**Output:** `min: A`, `max: B`, `sum: C` on three lines.

```cpp starter
#include <array>
#include <iostream>

int main() {
    std::array<int, 5> scores{};
}
```

```cpp solution
#include <array>
#include <iostream>

int main() {
    std::array<int, 5> scores{};
    for (int& s : scores) {
        std::cin >> s;
    }
    int lo = scores.front();
    int hi = scores.front();
    int sum = 0;
    for (int s : scores) {
        if (s < lo) lo = s;
        if (s > hi) hi = s;
        sum += s;
    }
    std::cout << "min: " << lo << '\n';
    std::cout << "max: " << hi << '\n';
    std::cout << "sum: " << sum << '\n';
}
```

```hint
`for (int& s : scores) std::cin >> s;` reads straight into each element (note the `&`).
```

```stdin
4 8 15 16 23
```

```expected
min: 4
max: 23
sum: 66
```

```stdin
-3 -3 -3 -3 -3
```

```expected hidden
min: -3
max: -3
sum: -15
```

```stdin
23 16 -15 8 4
```

```expected hidden
min: -15
max: 23
sum: 36
```

```checks
must std::array\s*<\s*int\s*,\s*5\s*> :: Use std::array<int, 5>.
mustnot <\s*5\s*;|<=\s*4\s*; :: Don't hard-code the size in your loops; use .size() or range-for.
```
:::

:::exercise Day lookup {easy}
Store the day names `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun` in a `std::array<std::string, 7>`.
Read integers until the end of input. For each, print the day name at that index, or `invalid` if
the number is not a valid index. Compare against `.size()` (watch out for negative numbers!).

**Input:** zero or more integers.
**Output:** one line per integer.

```cpp starter
#include <array>
#include <iostream>
#include <string>

int main() {
    int i;
    while (std::cin >> i) {
        std::cout << "invalid\n";
    }
}
```

```cpp solution
#include <array>
#include <iostream>
#include <string>

int main() {
    const std::array<std::string, 7> days{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
    int i;
    while (std::cin >> i) {
        if (i >= 0 && static_cast<std::size_t>(i) < days.size()) {
            std::cout << days[i] << '\n';
        } else {
            std::cout << "invalid\n";
        }
    }
}
```

```hint
Check `i >= 0` first, then compare with `days.size()`. Cast `i` to `std::size_t` to avoid a signed/unsigned warning.
```

```stdin
0 6 3
```

```expected
Mon
Sun
Thu
```

```stdin
7 -1 2
```

```expected hidden
invalid
invalid
Wed
```

```stdin
```

```expected hidden
```

```stdin
2147483647 -2147483648 6 5
```

```expected hidden
invalid
invalid
Sun
Sat
```

```checks
must std::array\s*<\s*std::string\s*,\s*7\s*> :: Store the names in a std::array<std::string, 7>.
must \.size\s*\(\s*\) :: Compare against .size().
```
:::

:::exercise Doubled copy {medium}
Write `std::array<int, 4> doubled(std::array<int, 4> values)` that takes the array **by value**,
doubles every element of its copy, and returns it. Read 4 integers into `original`, compute
`twice = doubled(original)`, and print:

1. the original array (unchanged),
2. the doubled array,
3. `same` if `original == twice`, otherwise `different`.

**Input:** 4 integers.
**Output:** three lines; the arrays' elements are separated by single spaces.

```cpp starter
#include <array>
#include <iostream>

int main() {
    std::array<int, 4> original{};
    for (int& v : original) {
        std::cin >> v;
    }
}
```

```cpp solution
#include <array>
#include <iostream>

std::array<int, 4> doubled(std::array<int, 4> values) {
    for (int& v : values) {
        v *= 2;
    }
    return values;
}

void print(const std::array<int, 4>& values) {
    for (std::size_t i = 0; i < values.size(); ++i) {
        std::cout << values[i] << (i + 1 < values.size() ? " " : "\n");
    }
}

int main() {
    std::array<int, 4> original{};
    for (int& v : original) {
        std::cin >> v;
    }
    std::array<int, 4> twice = doubled(original);
    print(original);
    print(twice);
    std::cout << (original == twice ? "same" : "different") << '\n';
}
```

```hint
Since the parameter is a copy, you can modify it freely and `return` it.
```

```stdin
1 2 3 4
```

```expected
1 2 3 4
2 4 6 8
different
```

```stdin
0 0 0 0
```

```expected hidden
0 0 0 0
0 0 0 0
same
```

```stdin
-5 0 5 -1
```

```expected hidden
-5 0 5 -1
-10 0 10 -2
different
```

```checks
must std::array\s*<\s*int\s*,\s*4\s*>\s+doubled\s*\(\s*std::array\s*<\s*int\s*,\s*4\s*>\s+\w+\s*\) :: Write std::array<int, 4> doubled(std::array<int, 4> values), taking the array by value.
must ==|!= :: Compare the two arrays with == or !=.
```
:::

:::exercise Next arrangement {hard}
Read 6 integers into a `std::array<int, 6>` and rearrange them into the **next arrangement** in
lexicographic (dictionary) order: the smallest rearrangement of the same numbers that is **greater**
than the current one, comparing arrays like `std::array`'s `<` does. Print it. If no greater
arrangement exists (the numbers never increase from left to right), print `last`.

Numbers may repeat. For example, after `1 2 3 4 5 6` comes `1 2 3 4 6 5`, after `1 3 5 4 2 0` comes
`1 4 0 2 3 5`, and `3 2 2 1 1 0` is `last`. Do the work yourself (no `std::next_permutation`,
`std::sort` or `std::reverse`).

**Input:** 6 integers.
**Output:** the next arrangement, separated by single spaces, or `last`, then a newline.

```cpp starter
#include <array>
#include <iostream>

int main() {
    std::array<int, 6> a{};
    for (int& x : a) {
        std::cin >> x;
    }
}
```

```cpp solution
#include <array>
#include <iostream>

// Rearranges a into the next greater arrangement. Returns false if a was already the greatest.
bool nextArrangement(std::array<int, 6>& a) {
    // 1. Find the last position i where a[i] < a[i + 1]. Everything after i never increases.
    std::size_t i = a.size() - 1;
    while (i > 0 && a[i - 1] >= a[i]) {
        --i;
    }
    if (i == 0) {
        return false;
    }
    std::size_t pivot = i - 1;

    // 2. Find the last element after the pivot that is strictly greater than it, and swap them.
    std::size_t j = a.size() - 1;
    while (a[j] <= a[pivot]) {
        --j;
    }
    int tmp = a[pivot];
    a[pivot] = a[j];
    a[j] = tmp;

    // 3. The tail is still non-increasing: reverse it to make it as small as possible.
    std::size_t lo = pivot + 1;
    std::size_t hi = a.size() - 1;
    while (lo < hi) {
        tmp = a[lo];
        a[lo] = a[hi];
        a[hi] = tmp;
        ++lo;
        --hi;
    }
    return true;
}

int main() {
    std::array<int, 6> a{};
    for (int& x : a) {
        std::cin >> x;
    }
    if (!nextArrangement(a)) {
        std::cout << "last\n";
        return 0;
    }
    for (std::size_t i = 0; i < a.size(); ++i) {
        std::cout << a[i] << (i + 1 < a.size() ? " " : "\n");
    }
}
```

```hint
Scan from the right for the first position `p` where `a[p] < a[p + 1]`. If there is none, the
arrangement is the last one. Everything to the right of `p` is in non-increasing order.
```

```hint
Swap `a[p]` with the **rightmost** element to its right that is strictly greater than `a[p]`. Then
reverse everything after position `p`.
```

```hint
Walk through `1 3 5 4 2 0` on paper: `p` is index 1 (the `3`), it swaps with the `4`, giving
`1 4 5 3 2 0`, and reversing the tail gives `1 4 0 2 3 5`.
```

```stdin
1 2 3 4 5 6
```

```expected
1 2 3 4 6 5
```

```stdin
1 3 5 4 2 0
```

```expected
1 4 0 2 3 5
```

```stdin
6 5 4 3 2 1
```

```expected hidden
last
```

```stdin
3 3 3 3 3 3
```

```expected hidden
last
```

```stdin
1 1 2 2 3 3
```

```expected hidden
1 1 2 3 2 3
```

```stdin
1 2 2 1 1 1
```

```expected hidden
2 1 1 1 1 2
```

```stdin
-1 0 0 -1 5 5
```

```expected hidden
-1 0 0 5 -1 5
```

```stdin
2 1 3 3 2 1
```

```expected hidden
2 2 1 1 3 3
```

```checks
must std::array\s*<\s*int\s*,\s*6\s*> :: Store the numbers in a std::array<int, 6>.
mustnot next_permutation|std::sort|std::reverse|std::swap :: Rearrange the elements yourself.
```
:::
