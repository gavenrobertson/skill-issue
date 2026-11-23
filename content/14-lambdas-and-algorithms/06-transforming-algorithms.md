---
title: Transforming Algorithms
summary: Algorithms that write and rearrange. transform, for_each, copy/copy_if, fill, generate, iota, reverse, rotate, unique, remove/remove_if with the erase idiom vs std::erase_if, replace, and back_inserter.
---

## Where does the output go?

Many algorithms in this lesson **write** elements. They take an **output iterator** (often called
`d_first`, "destination first") that says where to start writing. Here's the most important rule:

> **Algorithms never change the size of a container.** They write through iterators, and an
> iterator can't add elements. The destination must already have enough room, **or** you pass an
> **inserter** that calls `push_back` for you.

```cpp
std::vector<int> src{1, 2, 3};
std::vector<int> dst;                                      // EMPTY
std::copy(src.begin(), src.end(), dst.begin());            // BUG: writes into nonexistent elements (UB)

std::vector<int> ok(src.size());                           // fix 1: make room first
std::copy(src.begin(), src.end(), ok.begin());

std::vector<int> grow;                                     // fix 2: append with back_inserter
std::copy(src.begin(), src.end(), std::back_inserter(grow));
```

## Inserters: `back_inserter` and friends

From `<iterator>`:

| Inserter | Each write calls... | Works with |
| --- | --- | --- |
| `std::back_inserter(c)` | `c.push_back(x)` | vector, deque, list, string |
| `std::front_inserter(c)` | `c.push_front(x)` (so the order reverses) | deque, list |
| `std::inserter(c, it)` | `c.insert(it, x)` | any container, including set and map |

## `std::transform`

`transform` applies a function to each element and writes the results. The **unary** form reads one
range; the **binary** form reads two ranges in step and combines them:

```cpp run
#include <algorithm>
#include <cctype>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::vector<int> v{1, 2, 3, 4};

    // unary, into a new vector that already has room
    std::vector<int> squares(v.size());
    std::transform(v.begin(), v.end(), squares.begin(), [](int x) { return x * x; });
    print(squares);

    // unary, in place: the destination can be the source itself
    std::transform(v.begin(), v.end(), v.begin(), [](int x) { return x * 10; });
    print(v);

    // binary: combine two ranges element by element
    std::vector<int> a{1, 2, 3}, b{10, 20, 30}, sums;
    std::transform(a.begin(), a.end(), b.begin(), std::back_inserter(sums),
                   [](int x, int y) { return x + y; });
    print(sums);

    // into a different type: ints -> strings
    std::vector<std::string> labels;
    std::transform(a.begin(), a.end(), std::back_inserter(labels),
                   [](int x) { return "#" + std::to_string(x); });
    std::cout << labels[0] << ' ' << labels[2] << '\n';

    // uppercase a string (cast to unsigned char: toupper on negative chars is UB)
    std::string s = "shout";
    std::transform(s.begin(), s.end(), s.begin(),
                   [](unsigned char c) { return static_cast<char>(std::toupper(c)); });
    std::cout << s << '\n';
}
```

```output
1 4 9 16
10 20 30 40
11 22 33
#1 #3
SHOUT
```

In the binary form, the second range is given only by its start; it must have **at least as many**
elements as the first.

## `std::for_each`

`for_each` calls a function on each element, for its **side effects** (printing, accumulating,
modifying through a reference). It returns the function object, which is handy for stateful functors.
`std::for_each_n(first, n, f)` does the first `n` elements.

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5};

    std::for_each(v.begin(), v.end(), [](int& x) { x *= 2; });           // modify via reference
    std::for_each(v.begin(), v.end(), [](int x) { std::cout << x << ' '; });
    std::cout << '\n';

    std::for_each_n(v.begin(), 2, [](int x) { std::cout << "first two: " << x << '\n'; });
}
```

```output
2 4 6 8 10
first two: 2
first two: 4
```

For a whole container a range-based `for` is usually just as clear. `for_each` shines on
**sub-ranges** and with ready-made function objects.

## `copy`, `copy_if`, `copy_n`, `copy_backward`

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{5, -2, 8, -7, 0, 3};

    std::vector<int> all;
    std::copy(v.begin(), v.end(), std::back_inserter(all));

    std::vector<int> positives;
    std::copy_if(v.begin(), v.end(), std::back_inserter(positives), [](int x) { return x > 0; });

    std::vector<int> first3(3);
    std::copy_n(v.begin(), 3, first3.begin());

    // copy straight to the output, with ", " after each element
    std::copy(positives.begin(), positives.end(), std::ostream_iterator<int>(std::cout, ", "));
    std::cout << '\n' << all.size() << ' ' << first3[2] << '\n';
}
```

```output
5, 8, 3, 
6 8
```

`std::ostream_iterator<T>(stream, separator)` is an output iterator that prints each value written
to it. (Note the trailing separator after the last element.)

## `fill`, `generate`, `iota`

- `std::fill(first, last, value)` sets every element to `value`. `std::fill_n(first, n, value)` does `n`.
- `std::generate(first, last, gen)` sets every element to `gen()`, calling it each time.
- `std::iota(first, last, start)` (from **`<numeric>`**) writes `start`, `start + 1`, `start + 2`, ...

```cpp run
#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::vector<int> v(6);

    std::fill(v.begin(), v.end(), 7);
    print(v);

    std::fill_n(v.begin(), 2, 0);
    print(v);

    std::generate(v.begin(), v.end(), [n = 1]() mutable { return n *= 2; });   // powers of two
    print(v);

    std::iota(v.begin(), v.end(), 10);
    print(v);
}
```

```output
7 7 7 7 7 7
0 0 7 7 7 7
2 4 8 16 32 64
10 11 12 13 14 15
```

## `reverse` and `rotate`

`std::reverse(first, last)` reverses in place. `std::rotate(first, middle, last)` shifts elements
left so that `middle` becomes the new first element; the elements before it wrap around to the end.

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::string s = "stressed";
    std::reverse(s.begin(), s.end());
    std::cout << s << '\n';

    std::vector<int> v{1, 2, 3, 4, 5};
    std::rotate(v.begin(), v.begin() + 2, v.end());    // rotate left by 2
    for (int x : v) std::cout << x;
    std::cout << '\n';

    std::rotate(v.rbegin(), v.rbegin() + 2, v.rend()); // rotate right by 2 (using reverse iterators)
    for (int x : v) std::cout << x;
    std::cout << '\n';
}
```

```output
desserts
34512
12345
```

`std::reverse_copy` and `std::rotate_copy` write the result to a destination instead of modifying the source.

## The "remove" algorithms don't remove

This surprises everybody. `std::remove(first, last, value)` and `std::remove_if(first, last, pred)`
can't change the container's size (they only have iterators!). Instead they **shift the kept
elements to the front** and return an iterator to the **new logical end**. The elements after it
are left in a valid but unspecified state. To actually shrink the container, you call `erase`:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 0, 2, 0, 3, 0};

    auto new_end = std::remove(v.begin(), v.end(), 0);
    std::cout << "size is still " << v.size()
              << ", kept " << (new_end - v.begin()) << " elements\n";

    v.erase(new_end, v.end());                         // now really gone
    for (int x : v) std::cout << x << ' ';
    std::cout << "(size " << v.size() << ")\n";

    // The classic one-liner: the erase-remove idiom
    std::vector<int> w{5, -1, 6, -2, 7};
    w.erase(std::remove_if(w.begin(), w.end(), [](int x) { return x < 0; }), w.end());
    for (int x : w) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
size is still 6, kept 3 elements
1 2 3 (size 3)
5 6 7 
```

### C++20: `std::erase` and `std::erase_if`

C++20 added free functions that do the whole idiom in one call and return how many elements were
removed. They're overloaded for the standard sequence and associative containers (vector, string,
deque, list, map, set, unordered_map, ...). **Prefer them** in new code:

```cpp run
#include <iostream>
#include <map>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, 0, 2, 0, 3};
    auto removed = std::erase(v, 0);                                  // by value
    std::cout << "removed " << removed << ", size " << v.size() << '\n';

    std::erase_if(v, [](int x) { return x % 2 == 1; });              // by predicate
    std::cout << "left: " << v[0] << '\n';

    std::string s = "b-a-n-a-n-a";
    std::erase(s, '-');
    std::cout << s << '\n';

    std::map<std::string, int> stock{{"apple", 0}, {"pear", 4}, {"plum", 0}};
    std::erase_if(stock, [](const auto& kv) { return kv.second == 0; });
    std::cout << stock.size() << " in stock\n";
}
```

```output
removed 2, size 3
left: 2
banana
1 in stock
```

## `unique`: remove consecutive duplicates

`std::unique(first, last)` removes elements equal to the one **right before them**, and like
`remove` it returns the new logical end. To remove **all** duplicates, **sort first** so equal
values are next to each other:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{3, 1, 3, 3, 2, 1, 2};

    std::vector<int> only_adjacent = v;
    only_adjacent.erase(std::unique(only_adjacent.begin(), only_adjacent.end()), only_adjacent.end());
    for (int x : only_adjacent) std::cout << x << ' ';      // only the 3,3 pair collapsed
    std::cout << '\n';

    std::sort(v.begin(), v.end());                            // 1 1 2 2 3 3 3
    v.erase(std::unique(v.begin(), v.end()), v.end());        // 1 2 3
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
3 1 3 2 1 2 
1 2 3 
```

## `replace` and `replace_if`

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, -5, 3, -2, 1};
    std::replace(v.begin(), v.end(), 1, 100);                                // every 1 -> 100
    std::replace_if(v.begin(), v.end(), [](int x) { return x < 0; }, 0);     // negatives -> 0
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';

    std::string path = "C:\\Users\\ada";
    std::replace(path.begin(), path.end(), '\\', '/');
    std::cout << path << '\n';
}
```

```output
100 0 3 0 100 
C:/Users/ada
```

`replace_copy` and `replace_copy_if` write to a destination instead.

> **Note:** For containers that keep their own order, like `std::set` and `std::map`, use their
> member functions (`insert`, `erase`) or `std::erase_if`. Algorithms that reorder or overwrite
> elements (`sort`, `remove`, `unique`, `replace`) don't work on them, because their keys are `const`.

:::quiz
After this code, what is `v.size()`?

```cpp
std::vector<int> v{1, 2, 1, 3};
std::remove(v.begin(), v.end(), 1);
```

- [ ] `2`
- [x] `4`
- [ ] `3`
- [ ] `0`

`std::remove` only moves the kept elements to the front and returns the new logical end. Without
`v.erase(..., v.end())` the size doesn't change. (Or use C++20's `std::erase(v, 1)`.)
:::

:::quiz
What does `v` contain after this code?

```cpp
std::vector<int> v{2, 2, 1, 2, 2};
v.erase(std::unique(v.begin(), v.end()), v.end());
```

- [ ] `{1, 2}`
- [ ] `{2, 1}`
- [x] `{2, 1, 2}`
- [ ] `{2, 2, 1, 2, 2}`

`unique` only collapses **adjacent** equal elements. Sort first if you want every value once.
:::

:::exercise Square everything
Read `n` integers and print their squares, in the same order, using `std::transform`.

**Input:** `n`, then `n` integers (each between -10000 and 10000).
**Output:** the squares on one line, separated by spaces (an empty line if `n` is `0`).

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    // transform v here

    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::transform(v.begin(), v.end(), v.begin(), [](int x) { return x * x; });

    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```hint
Transform in place: `std::transform(v.begin(), v.end(), v.begin(), [](int x) { return x * x; });`
```

```stdin
4
1 -2 3 0
```

```expected
1 4 9 0
```

```stdin
2
-10000 7
```

```expected hidden
100000000 49
```

```checks
must std::transform|std::ranges::transform :: Use std::transform.
```
:::

:::exercise Keep the evens
Read `n` integers and copy the **even** ones (in order) into a new, initially empty vector using
`std::copy_if` and `std::back_inserter`. Print the new vector, or `none` if it's empty.

**Input:** `n`, then `n` integers.
**Output:** the even numbers separated by spaces, or `none`, followed by a newline.

```cpp starter
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::vector<int> evens;
    // fill evens

    if (evens.empty()) {
        std::cout << "none\n";
    } else {
        for (std::size_t i = 0; i < evens.size(); ++i) {
            if (i > 0) std::cout << ' ';
            std::cout << evens[i];
        }
        std::cout << '\n';
    }
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::vector<int> evens;
    std::copy_if(v.begin(), v.end(), std::back_inserter(evens), [](int x) { return x % 2 == 0; });

    if (evens.empty()) {
        std::cout << "none\n";
    } else {
        for (std::size_t i = 0; i < evens.size(); ++i) {
            if (i > 0) std::cout << ' ';
            std::cout << evens[i];
        }
        std::cout << '\n';
    }
}
```

```hint
`evens` is empty, so you can't write to `evens.begin()`. Use `std::back_inserter(evens)` as the destination.
```

```stdin
7
1 2 3 4 -6 7 0
```

```expected
2 4 -6 0
```

```stdin
3
1 3 -5
```

```expected
none
```

```checks
must copy_if :: Use std::copy_if.
must back_inserter :: Write into the new vector with std::back_inserter.
```
:::

:::exercise Distinct values
Read `n` integers and print each **distinct** value once, in ascending order, followed by how many
distinct values there are. Use `std::sort` and `std::unique` (with `erase`).

**Input:** `n`, then `n` integers.
**Output:** first line: the distinct values separated by spaces (an empty line if `n` is `0`);
second line: `distinct: D`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n' << "distinct: " << v.size() << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::sort(v.begin(), v.end());
    v.erase(std::unique(v.begin(), v.end()), v.end());

    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n' << "distinct: " << v.size() << '\n';
}
```

```hint
`unique` only removes duplicates that are next to each other, so sort first.
```

```hint
`v.erase(std::unique(v.begin(), v.end()), v.end());` shrinks the vector to the unique part.
```

```stdin
8
4 1 4 2 1 4 9 2
```

```expected
1 2 4 9
distinct: 4
```

```stdin
3
-7 -7 -7
```

```expected
-7
distinct: 1
```

```stdin
0
```

```expected hidden

distinct: 0
```

```checks
must std::unique|std::ranges::unique :: Use std::unique.
mustnot std::set :: Practice sort + unique here instead of a std::set.
```
:::

:::exercise Clean and rotate
Read `n` integers and a number `k`. Then:

1. Remove every **negative** number (use `std::erase_if`, or the erase-remove idiom with `std::remove_if`).
2. Replace every `0` with `-1` (use `std::replace`).
3. Rotate the result **left** by `k` positions (use `std::rotate`; `k` can be larger than the size,
   so rotate by `k % size`).

**Input:** `n`, `n` integers, then `k` (`k >= 0`).
**Output:** the resulting numbers separated by spaces, or `empty` if nothing is left.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int k;
    std::cin >> k;

    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int k;
    std::cin >> k;

    std::erase_if(v, [](int x) { return x < 0; });
    std::replace(v.begin(), v.end(), 0, -1);

    if (v.empty()) {
        std::cout << "empty\n";
        return 0;
    }
    std::rotate(v.begin(), v.begin() + k % static_cast<int>(v.size()), v.end());

    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```hint
`std::erase_if(v, [](int x) { return x < 0; });` removes the negatives (C++20).
```

```hint
Check for an empty vector **before** computing `k % v.size()` (dividing by zero is undefined behavior).
Then `std::rotate(v.begin(), v.begin() + k % size, v.end())`.
```

```stdin
7
3 -1 0 5 -8 7 9
2
```

```expected
5 7 9 3 -1
```

```stdin
3
1 2 3
7
```

```expected
2 3 1
```

```stdin
2
-4 -5
3
```

```expected hidden
empty
```

```checks
must erase_if|remove_if :: Remove the negatives with std::erase_if or std::remove_if.
must std::replace|std::ranges::replace :: Use std::replace.
must std::rotate|std::ranges::rotate :: Use std::rotate.
```
:::
