---
title: The STL & Iterators
summary: How containers, iterators and algorithms fit together, how to move through any container with iterators, and the five iterator categories.
---

## Three building blocks

The part of the standard library known as the **STL** (Standard Template Library) is built from three
kinds of pieces:

- **Containers** hold elements: `std::vector`, `std::list`, `std::set`, `std::map`, ...
- **Algorithms** do work on elements: `std::sort`, `std::find`, `std::count`, `std::reverse`, ... (from `<algorithm>` and `<numeric>`)
- **Iterators** connect the two. An iterator is an object that **points at an element** of a container and
  knows how to move to the next one.

The clever part: algorithms never talk to containers directly. They only take iterators. So `std::find`
is written **once** and works on a vector, a list, a set, a plain array, or your own container, as long as
it provides iterators. With `M` containers and `N` algorithms you need `M + N` pieces of code instead of
`M × N`.

```cpp run
#include <algorithm>
#include <iostream>
#include <list>
#include <vector>

int main() {
    std::vector<int> v{4, 8, 15, 16, 23, 42};
    std::list<int> l{4, 8, 15, 16, 23, 42};

    // The same algorithm, two very different containers
    auto vi = std::find(v.begin(), v.end(), 16);
    auto li = std::find(l.begin(), l.end(), 16);
    std::cout << *vi << ' ' << *li << '\n';

    std::cout << std::count(v.begin(), v.end(), 42) << '\n';
}
```

```output
16 16
1
```

## `begin()` and `end()`

Every container has two member functions that return iterators:

- `begin()` points at the **first** element.
- `end()` points **one past the last** element. It's a sentinel position, not an element: you must never
  dereference it.

```
  v:    [ 10 ][ 20 ][ 30 ]
          ^                 ^
       begin()            end()
```

Together they form a **half-open range** `[begin, end)`: the first is included, the second isn't. This
has nice properties: the number of elements is `end - begin`, and an empty container has
`begin() == end()`.

## The basic iterator operations

Iterators are designed to look like pointers:

| Operation | Meaning |
| --- | --- |
| `*it` | the element the iterator points at (a reference: you can read or assign it) |
| `it->member` | same as `(*it).member` |
| `++it` | move to the next element (`it++` also works, but `++it` is the idiom) |
| `it == other`, `it != other` | do they point at the same position? |

The classic iterator loop:

```cpp run
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> words{"alpha", "beta", "gamma"};

    for (std::vector<std::string>::iterator it = words.begin(); it != words.end(); ++it) {
        *it += "!";                          // modify through the iterator
    }

    for (auto it = words.begin(); it != words.end(); ++it) {   // auto saves a lot of typing
        std::cout << *it << " has " << it->size() << " chars\n";
    }
}
```

```output
alpha! has 6 chars
beta! has 5 chars
gamma! has 6 chars
```

Use `!=` (not `<`) to compare with `end()`. Every iterator supports `!=`, but only some support `<`.

### Range-for is iterators in disguise

The range-based `for` loop you already know is exactly this loop, written for you by the compiler:

```cpp
for (auto& w : words) { ... }

// is turned into roughly:
for (auto it = words.begin(); it != words.end(); ++it) {
    auto& w = *it;
    ...
}
```

So any type with `begin()` and `end()` works with range-for. Prefer range-for when you visit every
element in order. Use explicit iterators when you need the **position** (to insert or erase there), want
to go backward, skip around, or pass part of a container to an algorithm.

## `const` iterators: `cbegin()` / `cend()`

A `const_iterator` lets you read but not modify. You get one from a `const` container, or explicitly
with `cbegin()`/`cend()`:

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};
    for (auto it = v.cbegin(); it != v.cend(); ++it) {
        std::cout << *it << ' ';
        // *it = 0;   // error: assignment of read-only location
    }
    std::cout << '\n';

    const std::vector<int>& ref = v;
    std::vector<int>::const_iterator first = ref.begin();   // begin() on const gives const_iterator
    std::cout << *first << '\n';
}
```

```output
1 2 3
1
```

```cpp compile-error
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};
    auto it = v.cbegin();
    *it = 10;    // error: assignment of read-only location
}
```

## Reverse iterators: `rbegin()` / `rend()`

`rbegin()` points at the **last** element and `++` moves it **backwards**. `rend()` is one *before* the
first. There are also `crbegin()`/`crend()`.

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string s = "stressed";
    for (auto it = s.rbegin(); it != s.rend(); ++it) std::cout << *it;
    std::cout << '\n';

    std::string reversed(s.rbegin(), s.rend());   // containers can be built from any iterator range
    std::cout << reversed << '\n';
}
```

```output
desserts
desserts
```

## Iterator categories

Not every container can move the same way. A vector stores elements next to each other, so jumping 100
places is one addition. A linked list must follow 100 links. The STL groups iterators into
**categories** by what they can do. Each category can do everything the previous one can:

| Category | Adds | Example containers |
| --- | --- | --- |
| **Input** | read `*it`, `++it`, single pass only | reading from `std::cin` (`std::istream_iterator`) |
| **Forward** | multiple passes over the same range | `std::forward_list`, `std::unordered_set`/`map` |
| **Bidirectional** | `--it` (move backward) | `std::list`, `std::set`, `std::map` |
| **Random access** | `it + n`, `it - n`, `it[n]`, `it2 - it1`, `<` | `std::deque` |
| **Contiguous** (C++20) | elements guaranteed adjacent in memory | `std::vector`, `std::array`, `std::string`, plain arrays |

(There are also **output** iterators, which you can only write through, like `std::back_inserter`.)

Algorithms state which category they need. `std::sort` needs random access, so it doesn't work on a
`std::list` (that's why `list` has its own `sort()` member):

```cpp compile-error
#include <algorithm>
#include <list>

int main() {
    std::list<int> l{3, 1, 2};
    std::sort(l.begin(), l.end());   // error: no match for 'operator-' (list iterators aren't random access)
}
```

And arithmetic like `it + 2` is only available on random-access iterators:

```cpp compile-error
#include <list>

int main() {
    std::list<int> l{1, 2, 3};
    auto it = l.begin() + 2;   // error: no match for 'operator+'
}
```

## Moving iterators generically: `std::next`, `std::prev`, `std::advance`, `std::distance`

The header `<iterator>` has functions that work with **any** category, using the fastest method
available (a jump for random access, step-by-step otherwise):

| Function | Does |
| --- | --- |
| `std::next(it)` / `std::next(it, n)` | returns a copy moved forward 1 / `n` steps |
| `std::prev(it)` / `std::prev(it, n)` | returns a copy moved back (needs bidirectional) |
| `std::advance(it, n)` | moves `it` **itself** by `n` (negative `n` needs bidirectional) |
| `std::distance(first, last)` | number of steps from `first` to `last` |

```cpp run
#include <iostream>
#include <iterator>
#include <list>
#include <vector>

int main() {
    std::list<int> l{10, 20, 30, 40, 50};

    auto third = std::next(l.begin(), 2);
    std::cout << "third: " << *third << '\n';

    auto last = std::prev(l.end());
    std::cout << "last: " << *last << '\n';

    auto it = l.begin();
    std::advance(it, 3);            // modifies it in place
    std::cout << "after advance: " << *it << '\n';

    std::cout << "distance: " << std::distance(l.begin(), it) << '\n';

    std::vector<int> v{5, 6, 7};
    auto vit = v.begin() + 1;       // random access: arithmetic works directly
    std::cout << *vit << ' ' << vit[1] << ' ' << (v.end() - vit) << '\n';
}
```

```output
third: 30
last: 50
after advance: 40
distance: 3
6 7 2
```

## Finding a position, and what "not found" looks like

Algorithms that search return an iterator. "Not found" is signaled by returning the **end** iterator:

```cpp run
#include <algorithm>
#include <functional>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{3, 1, 4, 1, 5, 9};

    for (int target : {4, 7}) {
        auto it = std::find(v.begin(), v.end(), target);
        if (it != v.end()) {
            std::cout << target << " found at index " << std::distance(v.begin(), it) << '\n';
        } else {
            std::cout << target << " not found\n";
        }
    }

    // Algorithms work on any sub-range: here, only the last 3 elements
    std::sort(v.begin() + 3, v.end(), std::greater<int>());
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
4 found at index 2
7 not found
3 1 4 9 5 1
```

## Free functions `std::begin` / `std::end`

`std::begin(c)` and `std::end(c)` (and `std::size(c)`) work on containers **and plain arrays**, which have
no member functions. Generic code often uses them for that reason:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>

int main() {
    int raw[] = {5, 2, 8, 1};
    std::sort(std::begin(raw), std::end(raw));
    for (int x : raw) std::cout << x << ' ';
    std::cout << "(" << std::size(raw) << " elements)\n";
}
```

```output
1 2 5 8 (4 elements)
```

## Common mistakes

- **Dereferencing `end()`**: it points past the last element. `*v.end()` is undefined behavior.
- **Using an iterator from one container with another**: `std::find(a.begin(), b.end(), x)` is
  undefined behavior.
- **Calling `begin()` on an empty container and dereferencing it**: `*v.begin()` on an empty vector is UB.
  Check `!v.empty()` (or `begin() != end()`) first.
- **Going past the end with `+ n` or `std::next`**: also UB. Make sure there are enough elements.
- **Using `<` with non-random-access iterators**: write `it != end`.
- **Keeping iterators after modifying the container**: many operations *invalidate* iterators. The next
  lesson covers the rules for `vector`.

:::quiz
For `std::vector<int> v{1, 2, 3};`, which statements are true? (select all that apply)

- [x] `*v.begin()` is `1`
- [ ] `*v.end()` is `3`
- [x] `v.end() - v.begin()` is `3`
- [x] `*v.rbegin()` is `3`

`end()` is one past the last element and must not be dereferenced. `rbegin()` is the last element.
:::

:::quiz
Which iterator category does `std::list` provide?

- [ ] Forward
- [x] Bidirectional
- [ ] Random access
- [ ] Contiguous

A doubly linked list can step forward and backward, but can't jump `n` places in one step. That's why
`std::sort` doesn't accept list iterators.
:::

:::exercise Reverse with iterators
Read `n` integers into a `std::vector<int>` and print them in reverse order using **reverse
iterators** (`rbegin()` / `rend()`).

**Input:** `n`, then `n` integers.
**Output:** the integers in reverse order on one line, each followed by a single space. If `n` is 0,
print an empty line.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    for (auto it = v.begin(); it != v.end(); ++it) {
        std::cout << *it << ' ';
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    for (auto it = v.rbegin(); it != v.rend(); ++it) {
        std::cout << *it << ' ';
    }
    std::cout << '\n';
}
```

```hint
Replace `begin()`/`end()` with `rbegin()`/`rend()`. The `++it` stays the same: on a reverse iterator it
moves backwards through the container.
```

```stdin
5
1 2 3 4 5
```

```expected
5 4 3 2 1
```

```stdin
1
-8
```

```expected hidden
-8
```

```stdin
0
```

```expected hidden

```

```checks
must rbegin\s*\( :: Use rbegin().
must rend\s*\( :: Use rend().
```
:::

:::exercise Find the position
Read `n` integers and a target. Use `std::find` to locate the **first** occurrence of the target and
`std::distance` to turn the resulting iterator into an index.

**Input:** `n`, then `n` integers, then the target.
**Output:** `found at <index>` (0-based) or `not found`.

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
    int target;
    std::cin >> target;
    // use std::find and std::distance
    std::cout << "not found\n";
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
    int target;
    std::cin >> target;
    auto it = std::find(v.begin(), v.end(), target);
    if (it == v.end()) {
        std::cout << "not found\n";
    } else {
        std::cout << "found at " << std::distance(v.begin(), it) << '\n';
    }
}
```

```hint
`std::find(v.begin(), v.end(), target)` returns `v.end()` if the value isn't there.
```

```stdin
6
5 3 7 3 9 1
3
```

```expected
found at 1
```

```stdin
3
1 2 3
4
```

```expected hidden
not found
```

```stdin
0
5
```

```expected hidden
not found
```

```checks
must std::find\s*\( :: Use std::find.
must std::distance\s*\( :: Use std::distance to compute the index.
```
:::

:::exercise Neighbor differences
Read `n` integers into a `std::list<int>` and print the difference between each element and the one
before it (`second - first`, `third - second`, ...). Walk the list with two iterators, using
`std::next` to get the neighbor. (A list has no `[]`, so you can't use indices.)

**Input:** `n`, then `n` integers.
**Output:** the `n - 1` differences on one line separated by single spaces. If there are fewer than 2
numbers, print `none`.

```cpp starter
#include <iostream>
#include <iterator>
#include <list>

int main() {
    int n;
    std::cin >> n;
    std::list<int> values;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        values.push_back(x);
    }
    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>
#include <iterator>
#include <list>

int main() {
    int n;
    std::cin >> n;
    std::list<int> values;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        values.push_back(x);
    }
    if (values.size() < 2) {
        std::cout << "none\n";
        return 0;
    }
    bool first = true;
    for (auto it = values.begin(); std::next(it) != values.end(); ++it) {
        if (!first) std::cout << ' ';
        std::cout << *std::next(it) - *it;
        first = false;
    }
    std::cout << '\n';
}
```

```hint
Loop while `std::next(it) != values.end()`: that stops at the last element, which has no neighbor after it.
```

```hint
Check the size **first**. With an empty list, `std::next(values.begin())` would move past `end()`.
```

```stdin
5
1 4 9 16 25
```

```expected
3 5 7 9
```

```stdin
3
10 3 3
```

```expected hidden
-7 0
```

```stdin
1
42
```

```expected hidden
none
```

```checks
must std::list :: Store the numbers in a std::list.
must std::next\s*\( :: Use std::next to reach the neighbor.
```
:::
