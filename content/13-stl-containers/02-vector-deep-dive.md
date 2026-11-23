---
title: std::vector in Depth
summary: Size vs capacity, reserve, inserting and erasing anywhere, emplace_back, iterator invalidation, the vector<bool> quirk, erase-remove and the cost of each operation.
---

## How a vector works inside

You've used `std::vector` since the arrays lesson. Now let's look under the hood, because knowing how it
works explains its performance and its rules.

A vector owns **one contiguous block of heap memory**. It tracks three things:

- a pointer to the start of the block,
- its **size**: how many elements are actually in use,
- its **capacity**: how many elements fit in the block before it has to grow.

```
 capacity = 8
 [ 3 ][ 1 ][ 4 ][ 1 ][ 5 ][   ][   ][   ]
 \_______ size = 5 ______/ \_ spare _/
```

When you `push_back` and there's spare room, the element just goes in the next slot: very fast. When
`size == capacity`, the vector must **reallocate**: allocate a bigger block (typically 1.5x or 2x larger),
move every element over, and free the old block. That's expensive, but because the capacity grows
geometrically it happens rarely, so `push_back` is **amortized O(1)**.

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    std::size_t lastCap = v.capacity();
    std::cout << "size 0, capacity " << lastCap << '\n';
    for (int i = 1; i <= 20; ++i) {
        v.push_back(i);
        if (v.capacity() != lastCap) {
            lastCap = v.capacity();
            std::cout << "size " << v.size() << ", capacity " << lastCap << '\n';
        }
    }
}
```

```output
size 0, capacity 0
size 1, capacity 1
size 2, capacity 2
size 3, capacity 4
size 5, capacity 8
size 9, capacity 16
size 17, capacity 32
```

(This is GCC's library, which doubles. Other implementations use other growth factors, so never write
code that depends on exact capacities.)

## `reserve`, `resize` and `shrink_to_fit`

These are easy to confuse:

| Call | Changes size? | Changes capacity? |
| --- | --- | --- |
| `v.reserve(n)` | no | grows to at least `n` (never shrinks) |
| `v.resize(n)` | yes: adds default values or removes from the end | only if needed |
| `v.resize(n, value)` | yes: new elements are copies of `value` | only if needed |
| `v.clear()` | to 0 | no (memory is kept) |
| `v.shrink_to_fit()` | no | a *request* to reduce capacity to size |

If you know roughly how many elements you'll add, `reserve` first to avoid repeated reallocations:

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    v.reserve(100);                       // room for 100, but still empty
    std::cout << v.size() << ' ' << v.capacity() << '\n';

    for (int i = 0; i < 100; ++i) v.push_back(i);   // no reallocation happens here
    std::cout << v.size() << ' ' << v.capacity() << '\n';

    v.resize(3);                          // keeps 0, 1, 2
    std::cout << v.size() << ' ' << v.capacity() << '\n';

    v.shrink_to_fit();                    // give the unused memory back
    std::cout << v.size() << ' ' << v.capacity() << '\n';

    v.resize(5, 7);                       // grows: 0 1 2 7 7
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
0 100
100 100
3 100
3 3
0 1 2 7 7
```

A classic bug: calling `reserve(n)` and then writing `v[i] = ...`. `reserve` doesn't create elements, so
the vector is still empty and `v[0]` is out of bounds (undefined behavior). Use `resize` if you want
elements to exist, or `reserve` + `push_back`.

## Accessing elements

```cpp
v[i]          // no bounds check: out of range is undefined behavior
v.at(i)       // bounds-checked: throws std::out_of_range
v.front()     // first element (UB if empty)
v.back()      // last element (UB if empty)
v.data()      // pointer to the underlying array, for C APIs
```

## Inserting and erasing anywhere

`push_back`/`pop_back` work at the end. `insert` and `erase` work at any **position**, given as an
iterator:

```cpp run
#include <iostream>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::vector<int> v{10, 20, 30};

    v.insert(v.begin(), 5);                  // before the first: 5 10 20 30
    v.insert(v.begin() + 2, 15);             // before index 2:   5 10 15 20 30
    v.insert(v.end(), 2, 99);                // two copies at the end
    print(v);

    std::vector<int> extra{1, 2};
    v.insert(v.begin() + 1, extra.begin(), extra.end());   // a whole range
    v.insert(v.begin(), {-2, -1});                         // an initializer list
    print(v);

    v.erase(v.begin());                      // remove the first element
    v.erase(v.end() - 2, v.end());           // remove a range: the last two
    print(v);

    auto it = v.insert(v.begin() + 3, 0);    // insert returns an iterator to the new element
    std::cout << "inserted " << *it << " at index " << (it - v.begin()) << '\n';
}
```

```output
5 10 15 20 30 99 99
-2 -1 5 1 2 10 15 20 30 99 99
-1 5 1 2 10 15 20 30
inserted 0 at index 3
```

Inserting or erasing in the middle must **shift every later element** by one, so it's O(n). At the end
it's O(1). That's the main trade-off of `vector`.

## `emplace_back` vs `push_back`

`push_back(x)` takes an already-built object and copies (or moves) it in. `emplace_back(args...)` takes
**constructor arguments** and builds the object directly inside the vector's memory, skipping the
temporary:

```cpp run
#include <iostream>
#include <string>
#include <vector>

struct Book {
    std::string title;
    int year;
    Book(std::string t, int y) : title(std::move(t)), year(y) {
        std::cout << "  constructed " << title << '\n';
    }
};

int main() {
    std::vector<Book> shelf;
    shelf.reserve(3);

    std::cout << "push_back:\n";
    shelf.push_back(Book("Dune", 1965));     // builds a temporary, then moves it in

    std::cout << "emplace_back:\n";
    shelf.emplace_back("Neuromancer", 1984); // builds in place from the arguments

    for (const Book& b : shelf) std::cout << b.title << " (" << b.year << ")\n";
}
```

```output
push_back:
  constructed Dune
emplace_back:
  constructed Neuromancer
Dune (1965)
Neuromancer (1984)
```

Both printed "constructed" once, but `push_back` also performed a move of the temporary. For cheap types
the difference doesn't matter. Guidelines:

- Use `push_back` when you already have the object (`v.push_back(book)`).
- Use `emplace_back` when you're constructing a new one from arguments.
- There's also `emplace(pos, args...)`, the in-place version of `insert`.
- Since C++20, `emplace_back` also works for aggregates (structs without constructors), using
  parentheses-style initialization.

## Iterator invalidation

Because a vector can move its elements to a new block, iterators, pointers and references into it can
become **invalid** (dangling). Using an invalid iterator is undefined behavior: it may print garbage,
crash, or appear to work. The rules:

| Operation | What gets invalidated |
| --- | --- |
| `push_back`, `emplace_back`, `insert`, `emplace` | if capacity changed: **everything**. Otherwise: everything at or after the insertion point (and `end()`) |
| `reserve` (when it grows), `shrink_to_fit` | everything |
| `erase` | everything at or after the erased position (and `end()`) |
| `pop_back` | the last element and `end()` |
| `clear` | everything |
| reading, `[]`, modifying element values | nothing |

The most common bug: erasing inside a loop with a plain `++it`. After `erase(it)`, `it` is invalid. The
fix is to use the iterator that `erase` **returns**, which points at the element after the erased one:

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6};
    for (auto it = v.begin(); it != v.end(); /* no ++ here */) {
        if (*it % 2 == 0) {
            it = v.erase(it);       // continue from the element after the erased one
        } else {
            ++it;
        }
    }
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
1 3 5
```

Similarly, never keep a reference like `int& first = v[0];` and then `push_back`: the reallocation leaves
`first` dangling. (This loop is also O(n²) for many erasures; the erase-remove idiom below is O(n).)

## Removing by value: erase-remove and `std::erase` (C++20)

`std::remove(first, last, value)` from `<algorithm>` **doesn't actually remove** anything (algorithms only
see iterators, so they can't change a container's size). It moves the elements to keep to the front and
returns an iterator to the new logical end. You then `erase` the leftover tail. This two-step dance is the
**erase-remove idiom**:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 0, 2, 0, 3, 0};

    auto newEnd = std::remove(v.begin(), v.end(), 0);   // v is now 1 2 3 ? ? ?
    v.erase(newEnd, v.end());                           // chop off the tail
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';

    std::vector<int> w{5, -1, 7, -3, 9};
    w.erase(std::remove_if(w.begin(), w.end(), [](int x) { return x < 0; }), w.end());
    for (int x : w) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
1 2 3
5 7 9
```

`remove_if` takes a **predicate**, a function returning `bool` for each element. `[](int x) { return x < 0; }`
is a lambda: an inline unnamed function ("given `x`, return whether it's negative"). Module 14 covers them.

C++20 finally wraps this in one call. `std::erase` and `std::erase_if` are free functions that remove the
elements **and** return how many were removed:

```cpp run
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 0, 2, 0, 3, 0};
    auto removed = std::erase(v, 0);
    std::cout << "removed " << removed << ", left " << v.size() << '\n';

    std::vector<int> w{5, -1, 7, -3, 9};
    std::erase_if(w, [](int x) { return x < 0; });
    for (int x : w) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
removed 3, left 3
5 7 9
```

Prefer `std::erase`/`std::erase_if` in C++20 code. They exist for every standard container.

## The `vector<bool>` quirk

`std::vector<bool>` is a special case (a template specialization) that packs bools as **single bits** to
save memory. The price: its elements aren't real `bool` objects, so `v[i]` returns a proxy object instead
of a `bool&`, and you can't take a normal reference or pointer to one:

```cpp compile-error
#include <vector>

int main() {
    std::vector<bool> flags{true, false};
    bool& first = flags[0];   // error: cannot bind non-const lvalue reference of type 'bool&' to an rvalue
}
```

It also breaks generic code that expects `T&` from `operator[]`, and `data()` doesn't exist. Reading,
writing with `flags[0] = true`, and range-for by value all work. If you need real bools, use
`std::vector<char>`, `std::deque<bool>`, or `std::bitset<N>` for a fixed size.

## Complexity of vector operations

| Operation | Cost |
| --- | --- |
| `v[i]`, `at`, `front`, `back` | O(1) |
| `push_back`, `emplace_back` | amortized O(1) |
| `pop_back` | O(1) |
| `insert`/`erase` at position `p` | O(n) (shifts everything after `p`) |
| `insert`/`erase` at the end | O(1) |
| `std::find` (search by value) | O(n) |
| `size`, `empty`, `capacity` | O(1) |
| `clear` | O(n) (destroys elements) |

Contiguous memory also makes vector very **cache friendly**: walking through it is far faster in practice
than walking a linked structure, even when both are O(n). That's why `vector` is the default container.

## Common mistakes

- **`reserve` then indexing**: `reserve` doesn't create elements.
- **Erasing in a loop with `++it`**: use `it = v.erase(it)`, or better, `std::erase_if`.
- **Holding references/iterators across `push_back`**: they may dangle after a reallocation.
- **Forgetting the `erase` in erase-remove**: `std::remove` alone leaves the size unchanged.
- **Expecting `shrink_to_fit` or `clear` to always free memory**: `clear` never does; `shrink_to_fit` is a
  non-binding request (GCC honors it).

:::quiz
After `std::vector<int> v; v.reserve(10);`, what is `v.size()`?

- [x] `0`
- [ ] `10`
- [ ] It's undefined

`reserve` only changes capacity. The vector is still empty, so `v[0]` would be out of bounds.
:::

:::quiz
`it` points into a vector `v`. Which operations might leave `it` invalid? (select all that apply)

- [x] `v.push_back(1)`
- [x] `v.erase(v.begin())`
- [ ] `v[0] = 5`
- [x] `v.reserve(v.capacity() * 2)`

`push_back` may reallocate; `erase` shifts every later element (including whatever `it` pointed to, if it
was at or after the erased position); `reserve` that grows always reallocates. Assigning to an element
doesn't move anything.
:::

:::quiz
What does `v` contain after this?

```cpp
std::vector<int> v{1, 2, 1, 3};
std::remove(v.begin(), v.end(), 1);
```

- [ ] `2 3`
- [x] Still 4 elements: `2 3` followed by two unspecified values
- [ ] `1 2 1 3`, unchanged

`std::remove` can't change the size; it shifts the kept elements forward and returns the new logical end.
Without `erase`, the size stays 4.
:::

:::exercise Remove the negatives
Read `n` integers into a vector and remove every negative number using `std::erase_if` (or the
erase-remove idiom).

**Input:** `n`, then `n` integers.
**Output:** first line `removed K` where `K` is the number of removed values; second line the remaining
values separated by single spaces (an empty line if none remain).

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::cout << "removed 0\n";
    for (int x : v) std::cout << x << ' ';
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
    auto removed = std::erase_if(v, [](int x) { return x < 0; });
    std::cout << "removed " << removed << '\n';
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```hint
`std::erase_if(v, [](int x) { return x < 0; })` removes the negatives and returns how many it removed.
```

```stdin
6
3 -1 4 -1 -5 9
```

```expected
removed 3
3 4 9
```

```stdin
3
-1 -2 -3
```

```expected hidden
removed 3

```

```stdin
2
0 7
```

```expected hidden
removed 0
0 7
```

```checks
must erase_if|remove_if :: Use std::erase_if (or erase with std::remove_if).
```
:::

:::exercise Insert and erase by position
Read a vector of integers, insert a value at a given index, then erase the element at another index (in
the updated vector). Use the vector's `insert` and `erase` member functions with iterators.

**Input:** `n` and `n` integers; then `p v` (insert `v` so that it ends up at index `p`, where
`0 <= p <= n`); then `q` (erase the element at index `q` of the vector after the insertion).
**Output:** the final vector, values separated by single spaces.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int p, value, q;
    std::cin >> p >> value >> q;
    v.push_back(value);
    for (int x : v) std::cout << x << ' ';
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
    int p, value, q;
    std::cin >> p >> value >> q;
    v.insert(v.begin() + p, value);
    v.erase(v.begin() + q);
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```hint
`v.begin() + p` is an iterator to index `p`. `insert` puts the new value **before** that position, so it
ends up at index `p`.
```

```stdin
4
10 20 30 40
2 25
0
```

```expected
20 25 30 40
```

```stdin
2
1 2
2 3
1
```

```expected hidden
1 3
```

```stdin
0
0 9
0
```

```expected hidden

```

```checks
must \.insert\s*\( :: Use v.insert.
must \.erase\s*\( :: Use v.erase.
```
:::

:::exercise Sort and deduplicate
Read `n` integers, sort them, and remove duplicates using `std::unique` followed by `erase`. (`std::unique`
works like `std::remove`: it only removes **adjacent** duplicates and returns the new logical end, which is
why you sort first.)

**Input:** `n`, then `n` integers.
**Output:** the distinct values in increasing order, separated by single spaces, then on a second line
`distinct: K`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::sort(v.begin(), v.end());
    for (int x : v) std::cout << x << ' ';
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
`v.erase(std::unique(v.begin(), v.end()), v.end());` after sorting.
```

```stdin
8
3 1 3 2 1 3 5 2
```

```expected
1 2 3 5
distinct: 4
```

```stdin
4
7 7 7 7
```

```expected hidden
7
distinct: 1
```

```checks
must std::unique\s*\( :: Use std::unique.
must \.erase\s*\( :: Erase the leftover tail.
```
:::

:::exercise Emplace the people
A `Person` has a `name` and an `age` and a constructor `Person(std::string name, int age)`. Read `n`
people into a `std::vector<Person>`. Call `reserve(n)` first, then add each one with `emplace_back`
(passing the name and age directly, without creating a `Person` yourself). Finally print the adults.

**Input:** `n`, then `n` lines of `name age`.
**Output:** each person aged 18 or older as `name (age)`, one per line, in input order. If there are no
adults, print `no adults`.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

struct Person {
    std::string name;
    int age;
    Person(std::string n, int a) : name(std::move(n)), age(a) {}
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Person> people;
    // reserve, then read and emplace_back each person
    std::cout << "no adults\n";
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

struct Person {
    std::string name;
    int age;
    Person(std::string n, int a) : name(std::move(n)), age(a) {}
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Person> people;
    people.reserve(n);
    for (int i = 0; i < n; ++i) {
        std::string name;
        int age;
        std::cin >> name >> age;
        people.emplace_back(name, age);
    }
    bool any = false;
    for (const Person& p : people) {
        if (p.age >= 18) {
            std::cout << p.name << " (" << p.age << ")\n";
            any = true;
        }
    }
    if (!any) std::cout << "no adults\n";
}
```

```hint
`people.emplace_back(name, age);` forwards the two arguments to `Person`'s constructor.
```

```stdin
4
Ada 36
Tim 12
Grace 18
Linus 17
```

```expected
Ada (36)
Grace (18)
```

```stdin
2
Kid 3
Teen 17
```

```expected hidden
no adults
```

```checks
must \.reserve\s*\( :: Call reserve before adding the people.
must \.emplace_back\s*\( :: Add people with emplace_back.
mustnot emplace_back\s*\(\s*Person :: Pass the constructor arguments directly instead of building a Person first.
```
:::
