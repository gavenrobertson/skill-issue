---
title: Choosing a Container & std::span
summary: A decision guide with the complexity of every container's operations, std::span as a view over contiguous data, and practice picking the right tool.
---

## The whole toolbox at a glance

You've now met every standard container. Here is the cheat sheet. *n* is the number of elements;
"amortized" means "on average over many operations".

| Container | Access by index | Search by value/key | Insert/erase at end | Insert/erase at front | Insert/erase in middle | Order |
| --- | --- | --- | --- | --- | --- | --- |
| `std::array` | O(1) | O(n) | (fixed size) | (fixed size) | (fixed size) | as stored |
| `std::vector` | O(1) | O(n) | amortized O(1) | O(n) | O(n) | as inserted |
| `std::deque` | O(1) | O(n) | O(1) | O(1) | O(n) | as inserted |
| `std::list` | no (O(n) walk) | O(n) | O(1) | O(1) | O(1) at an iterator | as inserted |
| `std::forward_list` | no | O(n) | no `push_back` | O(1) | O(1) after an iterator | as inserted |
| `std::set` / `std::map` | no | O(log n) | O(log n) | O(log n) | O(log n) | **sorted** |
| `std::unordered_set` / `_map` | no | O(1) average | O(1) average | O(1) average | O(1) average | **none** |
| `std::stack` / `std::queue` | no | no | O(1) | O(1) (queue: pop) | no | LIFO / FIFO |
| `std::priority_queue` | no | no | O(log n) push/pop | | | largest first |

Big-O isn't everything. Contiguous containers (`array`, `vector`, `string`) are extremely cache friendly,
so for small and medium sizes a linear search in a vector often beats a tree lookup in a set. When
performance really matters, measure.

## A decision guide

Ask these questions in order:

1. **Do you look things up by a key** (a name, an ID) rather than by position?
   - Need sorted order, "smallest/largest", or "nearest to x"? Use **`std::map`** (key to value) or
     **`std::set`** (just keys).
   - Only exact lookups? Use **`std::unordered_map`** / **`std::unordered_set`**.
   - Several entries per key? The **multi** versions, or a map from key to a `std::vector`.
2. **Do you only ever touch one end?**
   - Last in, first out (undo, nesting, DFS): **`std::stack`**.
   - First in, first out (waiting lines, BFS): **`std::queue`**.
   - Always the most important next (scheduling, top-k, Dijkstra): **`std::priority_queue`**.
3. **Is it a sequence?**
   - Size fixed at compile time: **`std::array`**.
   - Otherwise: **`std::vector`**. Really. It's the right answer most of the time.
   - Need fast insertion at the front too: **`std::deque`**.
   - Need iterators that stay valid while inserting/erasing in the middle, or splicing: **`std::list`**.

Containers combine well, too: a vector for order plus a set for fast "have I seen this?" checks is a very
common pattern, and you'll practice it below.

## `std::span`: a view over contiguous data (C++20)

You often write functions that only need to **look at** (or modify) a run of elements, without caring
whether they live in a `std::vector`, a `std::array`, or a plain array. Before C++20 you'd write a template,
or pass a pointer and a size. C++20's **`std::span<T>`** (header `<span>`) is a lightweight object holding
exactly that: a pointer to the first element and a count.

```cpp run
#include <array>
#include <iostream>
#include <span>
#include <vector>

int sum(std::span<const int> values) {        // read-only view of any contiguous ints
    int total = 0;
    for (int x : values) total += x;
    return total;
}

int main() {
    std::vector<int> v{1, 2, 3, 4};
    std::array<int, 3> a{10, 20, 30};
    int raw[] = {100, 200};

    std::cout << sum(v) << ' ' << sum(a) << ' ' << sum(raw) << '\n';
}
```

```output
10 60 300
```

One non-template function accepts all three. Key facts about `std::span`:

- It's a **view**: it **doesn't own** the elements and never copies them. Copying a span is cheap (two
  words), so pass it **by value**.
- `std::span<const int>` gives read-only access; `std::span<int>` lets you **modify** the elements in the
  original container.
- It works only for **contiguous** memory: `vector`, `array`, `string`, plain arrays. Not `list`, `deque`
  or `set`.
- It has `size()`, `empty()`, `[]`, `front()`, `back()`, `data()`, iterators, and range-for.

### Slicing: `first`, `last`, `subspan`

A span can produce smaller spans, still without copying anything:

```cpp run
#include <iostream>
#include <span>
#include <vector>

void print(std::span<const int> s) {
    for (int x : s) std::cout << x << ' ';
    std::cout << "(size " << s.size() << ")\n";
}

void addOne(std::span<int> s) {
    for (int& x : s) ++x;                    // modifies the original vector
}

int main() {
    std::vector<int> v{0, 1, 2, 3, 4, 5, 6, 7};
    std::span<int> all(v);

    print(all.first(3));        // the first 3 elements
    print(all.last(2));         // the last 2 elements
    print(all.subspan(2, 4));   // 4 elements starting at index 2
    print(all.subspan(5));      // from index 5 to the end

    addOne(all.subspan(0, 2));
    print(v);                   // a vector converts to a span automatically
}
```

```output
0 1 2 (size 3)
6 7 (size 2)
2 3 4 5 (size 4)
5 6 7 (size 3)
1 2 2 3 4 5 6 7 (size 8)
```

Asking for more elements than exist (for example `first(10)` on 8 elements) is undefined behavior, just
like indexing past the end.

### Fixed extent

`std::span<T, N>` has its size fixed at compile time, like `std::array`. It's used when a function needs
exactly `N` elements:

```cpp
void setRGB(std::span<const unsigned char, 3> rgb);   // exactly 3 bytes
```

The default, `std::span<T>`, has a **dynamic extent** (any size) and is what you'll use almost always.

### Spans don't keep data alive

Since a span doesn't own anything, it **dangles** if the container it views is destroyed or reallocates:

```cpp
std::span<int> bad() {
    std::vector<int> local{1, 2, 3};
    return local;            // the vector dies here: the span points at freed memory
}

std::vector<int> v{1, 2, 3};
std::span<int> s(v);
v.push_back(4);              // may reallocate: s now dangles
```

Use spans as **function parameters** (where the caller's container clearly outlives the call), and be
careful storing them. The same applies to `std::string_view`, which is essentially a read-only span of
characters.

A span over a non-contiguous container doesn't compile:

```cpp compile-error
#include <list>
#include <span>

int total(std::span<const int> s) {
    int t = 0;
    for (int x : s) t += x;
    return t;
}

int main() {
    std::list<int> l{1, 2, 3};
    total(l);    // error: could not convert 'l' from 'std::list<int>' to 'std::span<const int>'
}
```

## Putting containers together

A typical program uses several containers at once, each for what it's good at. Here, a vector keeps the
original order and an unordered_set answers "seen before?" in O(1):

```cpp run
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int main() {
    std::vector<std::string> input{"b", "a", "b", "c", "a", "d"};

    std::vector<std::string> uniqueInOrder;
    std::unordered_set<std::string> seen;
    for (const auto& s : input) {
        if (seen.insert(s).second) uniqueInOrder.push_back(s);
    }
    for (const auto& s : uniqueInOrder) std::cout << s << ' ';
    std::cout << '\n';
}
```

```output
b a c d
```

Note how the output comes from the **vector**, so its order is well defined even though a hash set is
involved.

:::quiz
You need to store user records and repeatedly look one up by its username. Order doesn't matter. What's
the best default choice?

- [ ] `std::vector<User>` with a linear search
- [ ] `std::list<User>`
- [x] `std::unordered_map<std::string, User>`
- [ ] `std::stack<User>`

Exact lookups by key, no ordering needed: a hash map gives average O(1) lookups.
:::

:::quiz
Which can be passed to a function taking `std::span<const int>`? (select all that apply)

- [x] `std::vector<int>`
- [x] `std::array<int, 5>`
- [x] `int raw[10]`
- [ ] `std::list<int>`
- [ ] `std::set<int>`

A span needs contiguous memory. Lists and sets store their elements in separate nodes.
:::

:::exercise Sum through a span {easy}
Write `long long sum(std::span<const int> values)` and use it with slices of a vector.

**Input:** `n`, then `n` integers.
**Output:** three lines: the sum of all values, the sum of the first `n / 2` values (integer division),
and the sum of the remaining values.

```cpp starter
#include <iostream>
#include <span>
#include <vector>

long long sum(const std::vector<int>& values) {
    long long total = 0;
    for (int x : values) total += x;
    return total;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::cout << sum(v) << '\n';
    // also print the sums of the first half and the rest, using spans
}
```

```cpp solution
#include <iostream>
#include <span>
#include <vector>

long long sum(std::span<const int> values) {
    long long total = 0;
    for (int x : values) total += x;
    return total;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::span<const int> all(v);
    std::size_t half = all.size() / 2;
    std::cout << sum(all) << '\n';
    std::cout << sum(all.first(half)) << '\n';
    std::cout << sum(all.subspan(half)) << '\n';
}
```

```hint
Create `std::span<const int> all(v);`, then `all.first(k)` is the first `k` elements and `all.subspan(k)`
is everything from index `k` on.
```

```stdin
5
1 2 3 4 5
```

```expected
15
3
12
```

```stdin
1
-7
```

```expected hidden
-7
0
-7
```

```stdin
0
```

```expected hidden
0
0
0
```

```stdin
2
2147483647 2147483647
```

```expected hidden
4294967294
2147483647
2147483647
```

```checks
must std::span :: Use std::span.
must \.(first|last|subspan)\s*\( :: Slice the span with first, last or subspan.
```
:::

:::exercise Double a slice {easy}
Write `void doubleAll(std::span<int> values)` that doubles every element **in place**. Apply it to the
elements from index `l` to index `r` (inclusive) of a vector, using `subspan`.

**Input:** `n` and `n` integers, then `l` and `r` (`0 <= l <= r < n`).
**Output:** the whole vector after the change, values separated by single spaces.

```cpp starter
#include <iostream>
#include <span>
#include <vector>

void doubleAll(std::vector<int> values) {
    for (int& x : values) x *= 2;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int l, r;
    std::cin >> l >> r;
    doubleAll(v);
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <span>
#include <vector>

void doubleAll(std::span<int> values) {
    for (int& x : values) x *= 2;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int l, r;
    std::cin >> l >> r;
    std::span<int> all(v);
    doubleAll(all.subspan(l, r - l + 1));
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```hint
The starter's version takes the vector **by value**, so it doubles a copy. A `std::span<int>` refers to
the original elements instead.
```

```hint
The range `l..r` inclusive has `r - l + 1` elements: `all.subspan(l, r - l + 1)`.
```

```stdin
5
1 2 3 4 5
1 3
```

```expected
1 4 6 8 5
```

```stdin
3
-1 0 7
2 2
```

```expected hidden
-1 0 14
```

```stdin
4
1 2 3 4
0 3
```

```expected hidden
2 4 6 8
```

```checks
must std::span\s*<\s*int\s*> :: Take a std::span<int> parameter.
must \.subspan\s*\( :: Use subspan to select the slice.
```
:::

:::exercise Visitors in order {medium}
A website logs each visit by username. Print each **distinct** visitor once, in the order of their
**first** visit, followed by statistics. Combine two containers: one that remembers order and one that
answers "seen before?" quickly.

**Input:** usernames separated by whitespace, until the input ends.
**Output:** the distinct usernames in first-visit order, separated by single spaces (an empty line if
there were none), then a line `visits: V, unique: U`.

```cpp starter
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int main() {
    std::vector<std::string> log;
    std::string name;
    while (std::cin >> name) log.push_back(name);
    for (const auto& n : log) std::cout << n << ' ';
    std::cout << '\n' << "visits: " << log.size() << ", unique: " << log.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int main() {
    std::vector<std::string> order;
    std::unordered_set<std::string> seen;
    std::size_t visits = 0;
    std::string name;
    while (std::cin >> name) {
        ++visits;
        if (seen.insert(name).second) order.push_back(name);
    }
    for (std::size_t i = 0; i < order.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << order[i];
    }
    std::cout << '\n' << "visits: " << visits << ", unique: " << order.size() << '\n';
}
```

```hint
Use a `std::vector<std::string>` for the order and a `std::unordered_set<std::string>` to check whether a
name was already added.
```

```stdin
zoe adam zoe bob adam zoe
```

```expected
zoe adam bob
visits: 6, unique: 3
```

```stdin
```

```expected hidden

visits: 0, unique: 0
```

```stdin
a a a
```

```expected hidden
a
visits: 3, unique: 1
```

```checks
must std::vector :: Keep the order in a std::vector.
must std::(unordered_)?set :: Use a set (or unordered_set) for the "seen" check.
```
:::

:::exercise Leaderboard {medium}
Players earn points over several rounds. Accumulate each player's total with a map, then print a ranking:
highest total first, ties in alphabetical order.

**Input:** `n`, then `n` lines `name points` (a player may appear many times; points may be negative).
**Output:** one line per player: `rank. name total`, where rank starts at 1 and simply counts lines.

```cpp starter
#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string name;
        int points;
        std::cin >> name >> points;
        std::cout << i + 1 << ". " << name << ' ' << points << '\n';
    }
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::map<std::string, int> totals;
    for (int i = 0; i < n; ++i) {
        std::string name;
        int points;
        std::cin >> name >> points;
        totals[name] += points;
    }

    std::vector<std::pair<int, std::string>> ranking;
    for (const auto& [name, total] : totals) ranking.push_back({-total, name});
    std::sort(ranking.begin(), ranking.end());    // smallest -total first = highest total first

    int rank = 1;
    for (const auto& [negTotal, name] : ranking) {
        std::cout << rank++ << ". " << name << ' ' << -negTotal << '\n';
    }
}
```

```hint
`totals[name] += points;` accumulates (a new name starts at 0).
```

```hint
A map is sorted by **name**, not by total. Copy into a `std::vector<std::pair<int, std::string>>` and
sort. A trick: store `-total` as the first member, so the default pair ordering puts the highest total
first and breaks ties alphabetically by name.
```

```stdin
5
ann 10
bob 15
cat 5
ann 7
cat 12
```

```expected
1. ann 17
2. cat 17
3. bob 15
```

```stdin
2
solo -3
solo 1
```

```expected hidden
1. solo -2
```

```stdin
4
b 0
a 0
c -1
b 0
```

```expected hidden
1. a 0
2. b 0
3. c -1
```

```checks
must std::(unordered_)?map :: Accumulate the totals in a map.
must sort\s*\( :: Sort the ranking.
```
:::

:::exercise Library desk {hard}
Run a small library's lending desk. Choose a fitting container for each piece of state: how many
copies of each title are on the shelf, the **waiting line** for each title (first come, first
served), and which titles each user currently holds (printed alphabetically).

| Command | Output |
| --- | --- |
| `add TITLE N` | Adds `N` copies (`N >= 1`; the title may be new). Each copy first goes to the next person waiting for it, printing `USER gets TITLE`. Finally prints `TITLE: K on shelf`. |
| `borrow USER TITLE` | `no such title` if it was never added. `already borrowed` if the user holds it. Otherwise, with a copy on the shelf: `USER borrowed TITLE`. Otherwise `already waiting` if the user is in that title's line, else they join the end of the line: `USER waits for TITLE (position P)` (1-based). |
| `return USER TITLE` | `not borrowed` if the user doesn't hold it. Otherwise, if someone is waiting, the copy goes straight to the first of them: `USER returned TITLE, NEXT gets it`. Otherwise it goes back on the shelf: `USER returned TITLE`. |
| `holding USER` | `USER:` followed by ` TITLE` for each title they hold, alphabetically, or `USER: nothing`. |

**Input:** one command per line until the input ends. Users and titles are single words.
**Output:** one line per printed message, as above.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string cmd;
    while (std::cin >> cmd) {
        // add, borrow, return, holding
    }
}
```

```cpp solution
#include <algorithm>
#include <deque>
#include <iostream>
#include <map>
#include <set>
#include <string>

int main() {
    std::map<std::string, int> shelf;                          // title -> copies available
    std::map<std::string, std::deque<std::string>> waiting;    // title -> line of users
    std::map<std::string, std::set<std::string>> holds;        // user -> titles (sorted)

    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "add") {
            std::string title;
            int n;
            std::cin >> title >> n;
            int& copies = shelf[title];
            auto& line = waiting[title];
            for (int i = 0; i < n; ++i) {
                if (!line.empty()) {
                    std::cout << line.front() << " gets " << title << '\n';
                    holds[line.front()].insert(title);
                    line.pop_front();
                } else {
                    ++copies;
                }
            }
            std::cout << title << ": " << copies << " on shelf\n";
        } else if (cmd == "borrow") {
            std::string user, title;
            std::cin >> user >> title;
            auto it = shelf.find(title);
            if (it == shelf.end()) {
                std::cout << "no such title\n";
            } else if (holds[user].contains(title)) {
                std::cout << "already borrowed\n";
            } else if (it->second > 0) {
                --it->second;
                holds[user].insert(title);
                std::cout << user << " borrowed " << title << '\n';
            } else {
                auto& line = waiting[title];
                if (std::find(line.begin(), line.end(), user) != line.end()) {
                    std::cout << "already waiting\n";
                } else {
                    line.push_back(user);
                    std::cout << user << " waits for " << title << " (position " << line.size() << ")\n";
                }
            }
        } else if (cmd == "return") {
            std::string user, title;
            std::cin >> user >> title;
            auto h = holds.find(user);
            if (h == holds.end() || !h->second.contains(title)) {
                std::cout << "not borrowed\n";
                continue;
            }
            h->second.erase(title);
            auto& line = waiting[title];
            if (!line.empty()) {
                std::string next = line.front();
                line.pop_front();
                holds[next].insert(title);
                std::cout << user << " returned " << title << ", " << next << " gets it\n";
            } else {
                ++shelf[title];
                std::cout << user << " returned " << title << '\n';
            }
        } else if (cmd == "holding") {
            std::string user;
            std::cin >> user;
            auto h = holds.find(user);
            if (h == holds.end() || h->second.empty()) {
                std::cout << user << ": nothing\n";
            } else {
                std::cout << user << ':';
                for (const auto& title : h->second) std::cout << ' ' << title;
                std::cout << '\n';
            }
        }
    }
}
```

```hint
One possible design: `std::map<std::string, int>` for the shelf counts, a `std::map` from title to a
`std::deque<std::string>` (or `std::queue`) for the waiting lines, and a `std::map` from user to a
`std::set<std::string>` for what they hold (a set keeps the titles sorted and answers "holds it?" fast).
```

```hint
"Never added" must be checked with `find` on the shelf map: `shelf[title]` would create the title
with 0 copies, and the next `borrow` would put people in line for a book that doesn't exist.
```

```hint
A user who gets a copy from the line (on `add` or on someone's `return`) now holds it, and leaves
the line.
```

```stdin
add dune 1
borrow ann dune
borrow bob dune
borrow cat dune
borrow bob dune
return ann dune
holding bob
holding ann
```

```expected
dune: 1 on shelf
ann borrowed dune
bob waits for dune (position 1)
cat waits for dune (position 2)
already waiting
ann returned dune, bob gets it
bob: dune
ann: nothing
```

```stdin
borrow ann ghost
return ann ghost
holding nobody
add ghost 2
borrow ann ghost
borrow ann ghost
holding ann
```

```expected
no such title
not borrowed
nobody: nothing
ghost: 2 on shelf
ann borrowed ghost
already borrowed
ann: ghost
```

```stdin
add a 1
borrow w a
borrow x a
borrow y a
borrow z a
add a 2
holding y
return x a
return y a
add a 1
borrow z a
borrow y a
holding z
holding y
```

```expected hidden
a: 1 on shelf
w borrowed a
x waits for a (position 1)
y waits for a (position 2)
z waits for a (position 3)
x gets a
y gets a
a: 0 on shelf
y: a
x returned a, z gets it
y returned a
a: 2 on shelf
already borrowed
y borrowed a
z: a
y: a
```

```stdin
add zeta 1
add alpha 1
add mid 3
borrow u zeta
borrow u alpha
borrow u mid
holding u
return u alpha
return u alpha
borrow v alpha
holding v
holding u
```

```expected hidden
zeta: 1 on shelf
alpha: 1 on shelf
mid: 3 on shelf
u borrowed zeta
u borrowed alpha
u borrowed mid
u: alpha mid zeta
u returned alpha
not borrowed
v borrowed alpha
v: alpha
u: mid zeta
```

```checks
must std::(unordered_)?map :: Use maps for the per-title and per-user state.
must std::(deque|queue|list) :: Keep each waiting line in a queue-like container.
must std::set :: Keep each user's titles in a std::set.
```
:::
