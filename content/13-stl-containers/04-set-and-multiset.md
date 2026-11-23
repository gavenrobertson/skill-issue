---
title: std::set & std::multiset
summary: Sorted collections of unique (or repeated) values: inserting, searching, erasing, range queries with lower_bound/upper_bound, and custom ordering.
---

## A sorted bag of unique values

A `std::set<T>` (header `<set>`) stores values **in sorted order** and **without duplicates**. Insert a
value that's already there and nothing happens. Lookups, insertions and erasures are all **O(log n)**.

```cpp run
#include <iostream>
#include <set>
#include <string>

int main() {
    std::set<int> s{5, 1, 4, 1, 5, 9, 2, 6};   // duplicates are dropped
    s.insert(3);
    s.insert(4);                               // already there: no effect

    for (int x : s) std::cout << x << ' ';     // always in increasing order
    std::cout << "\nsize " << s.size() << '\n';

    std::set<std::string> tags{"cpp", "stl", "algorithms", "cpp"};
    for (const auto& t : tags) std::cout << t << ' ';
    std::cout << '\n';
}
```

```output
1 2 3 4 5 6 9
size 7
algorithms cpp stl
```

Under the hood a set is a **balanced binary search tree** (usually a red-black tree). Each value lives in
its own node, ordered so that smaller values are to the left. That's why everything is O(log n), why
iteration comes out sorted, and why its iterators are bidirectional (no `[]`, no `it + n`).

The elements of a set are **const**: changing one in place could break the ordering. To "modify" a value,
erase it and insert the new value.

```cpp compile-error
#include <set>

int main() {
    std::set<int> s{1, 2, 3};
    auto it = s.begin();
    *it = 10;     // error: assignment of read-only location
}
```

## `insert` tells you whether it inserted

`insert` returns a `std::pair<iterator, bool>`: an iterator to the element (new or already existing), and
`true` if the value was actually inserted:

```cpp run
#include <iostream>
#include <set>
#include <string>

int main() {
    std::set<std::string> seen;
    for (std::string word : {"red", "green", "red", "blue", "green"}) {
        auto [it, inserted] = seen.insert(word);     // structured bindings unpack the pair
        std::cout << *it << (inserted ? " is new\n" : " was already seen\n");
    }

    auto result = seen.insert("red");                // the same without structured bindings
    std::cout << std::boolalpha << result.second << '\n';
}
```

```output
red is new
green is new
red was already seen
blue is new
green was already seen
false
```

`emplace(args...)` does the same while constructing the value in place.

## Searching: `find`, `count`, `contains`

```cpp run
#include <iostream>
#include <set>

int main() {
    std::set<int> primes{2, 3, 5, 7, 11, 13};

    auto it = primes.find(7);                    // iterator to 7, or end() if missing
    if (it != primes.end()) std::cout << "found " << *it << '\n';
    if (primes.find(8) == primes.end()) std::cout << "8 not found\n";

    std::cout << primes.count(11) << primes.count(12) << '\n';   // 1 or 0 for a set

    if (primes.contains(13)) std::cout << "13 is prime\n";        // C++20, the clearest
}
```

```output
found 7
8 not found
10
13 is prime
```

Always use the **member** `find`, not `std::find(s.begin(), s.end(), x)`: the member uses the tree and is
O(log n), the algorithm walks every element in O(n).

## Erasing

```cpp run
#include <iostream>
#include <set>

void print(const std::set<int>& s) {
    for (int x : s) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::set<int> s{1, 2, 3, 4, 5, 6, 7, 8};

    std::size_t n = s.erase(3);                  // by value: returns how many were erased (0 or 1)
    std::cout << "erased " << n << '\n';

    s.erase(s.begin());                          // by iterator: removes the smallest
    print(s);

    s.erase(s.find(6), s.end());                 // a range: 6 and everything after
    print(s);

    std::erase_if(s, [](int x) { return x % 2 == 0; });   // C++20: remove the even values
    print(s);
}
```

```output
erased 1
2 4 5 6 7 8
2 4 5
5
```

Erasing only invalidates iterators to the erased element. Everything else stays valid, as with a list.

## Range queries: `lower_bound` and `upper_bound`

Because a set is sorted, it can answer "where would `x` go?" in O(log n):

- `s.lower_bound(x)`: iterator to the first element **`>= x`**.
- `s.upper_bound(x)`: iterator to the first element **`> x`**.
- Both return `end()` if there's no such element.

```cpp run
#include <iostream>
#include <iterator>
#include <set>

int main() {
    std::set<int> s{10, 20, 30, 40, 50};

    std::cout << *s.lower_bound(30) << ' ' << *s.upper_bound(30) << '\n';   // 30 40
    std::cout << *s.lower_bound(25) << ' ' << *s.upper_bound(25) << '\n';   // 30 30

    // smallest element >= 55?
    if (s.lower_bound(55) == s.end()) std::cout << "nothing >= 55\n";

    // largest element <= 35: step back from upper_bound
    auto it = s.upper_bound(35);
    if (it != s.begin()) std::cout << "largest <= 35 is " << *std::prev(it) << '\n';

    // all values in [15, 45)
    for (auto i = s.lower_bound(15); i != s.lower_bound(45); ++i) std::cout << *i << ' ';
    std::cout << '\n';
}
```

```output
30 40
30 30
nothing >= 55
largest <= 35 is 30
20 30 40
```

This "find the nearest value" ability is what sets a set apart from a hash set (next lessons).

## Custom ordering

By default a set orders with `<` (more exactly, with `std::less<T>`). The ordering is a **second template
argument**, so you can change it. For "biggest first", use `std::greater<T>` from `<functional>`:

```cpp run
#include <functional>
#include <iostream>
#include <set>
#include <string>

struct ByLengthThenAlpha {
    bool operator()(const std::string& a, const std::string& b) const {
        if (a.size() != b.size()) return a.size() < b.size();
        return a < b;
    }
};

int main() {
    std::set<int, std::greater<int>> desc{3, 1, 4, 1, 5};
    for (int x : desc) std::cout << x << ' ';
    std::cout << '\n';

    std::set<std::string, ByLengthThenAlpha> words{"banana", "fig", "apple", "kiwi", "date"};
    for (const auto& w : words) std::cout << w << ' ';
    std::cout << '\n';
}
```

```output
5 4 3 1
fig date kiwi apple banana
```

A comparator is a type with an `operator()` that takes two elements and returns `true` if the first must
come **before** the second. Two rules:

- It must be a **strict** ordering: `comp(a, a)` must be `false`. Using `<=` breaks the set.
- Two elements are treated as **equal** (duplicates) when neither comes before the other. If
  `ByLengthThenAlpha` only compared lengths, `"kiwi"` and `"date"` would count as duplicates and only one
  would be kept!

To store your own struct in a set, it needs either an `operator<` or a comparator. Since C++20 you can
also just default the comparison operators: `auto operator<=>(const Point&) const = default;`.

## `std::multiset`: duplicates allowed

`std::multiset<T>` (also in `<set>`) is a set that **keeps duplicates**, still sorted. Equal elements sit
next to each other.

```cpp run
#include <iostream>
#include <set>

int main() {
    std::multiset<int> ms{5, 1, 5, 3, 5, 1};
    for (int x : ms) std::cout << x << ' ';
    std::cout << '\n';

    std::cout << "count(5) = " << ms.count(5) << '\n';     // can be more than 1

    ms.insert(5);                                       // always inserts; returns just an iterator

    // all copies of 5: equal_range returns {lower_bound(5), upper_bound(5)}
    auto [first, last] = ms.equal_range(5);
    int copies = 0;
    for (auto it = first; it != last; ++it) ++copies;
    std::cout << "copies of 5: " << copies << '\n';

    ms.erase(ms.find(5));      // erases ONE copy
    std::cout << "after erasing one: " << ms.count(5) << '\n';

    ms.erase(5);               // by value: erases ALL copies
    std::cout << "after erasing all: " << ms.count(5) << '\n';
}
```

```output
1 1 3 5 5 5
count(5) = 3
copies of 5: 4
after erasing one: 3
after erasing all: 0
```

`ms.erase(value)` removing **every** copy is a classic trap. To remove one, erase by iterator. Note also
that `count` on a multiset is O(log n + number of matches).

`equal_range` exists on `set` too (where the range has 0 or 1 elements), but it's mostly useful for
multisets and multimaps.

## Summary of operations

| Operation | set | multiset | Cost |
| --- | --- | --- | --- |
| `insert(x)` | adds if absent; returns `pair<it, bool>` | always adds; returns `it` | O(log n) |
| `find(x)` | iterator or `end()` | iterator to *one* copy, or `end()` | O(log n) |
| `count(x)` | 0 or 1 | number of copies | O(log n) (+ copies) |
| `contains(x)` (C++20) | bool | bool | O(log n) |
| `erase(x)` | removes it | removes **all** copies | O(log n) (+ copies) |
| `erase(it)` | removes that element | removes that one copy | amortized O(1) |
| `lower_bound`, `upper_bound`, `equal_range` | yes | yes | O(log n) |

:::quiz
What does this print?

```cpp
std::set<int> s{3, 1, 3, 2};
s.insert(1);
std::cout << s.size();
```

- [ ] `5`
- [ ] `4`
- [x] `3`

A set ignores duplicates: it holds `{1, 2, 3}`, and inserting `1` again changes nothing.
:::

:::quiz
For `std::set<int> s{10, 20, 30};`, which statements are true? (select all that apply)

- [x] `*s.lower_bound(20)` is `20`
- [x] `*s.upper_bound(20)` is `30`
- [x] `s.lower_bound(31) == s.end()`
- [ ] `*s.upper_bound(5)` is `5`

`lower_bound` finds the first element `>= x`, `upper_bound` the first `> x`. `upper_bound(5)` is `10`.
:::

:::quiz
`ms` is a `std::multiset<int>` containing `7` three times. What does `ms.erase(7);` do?

- [ ] Removes one `7`
- [x] Removes all three `7`s and returns 3
- [ ] Doesn't compile

Erasing by value removes every equal element. To remove just one, use `ms.erase(ms.find(7));`.
:::

:::exercise Distinct, biggest first {easy}
Read `n` integers and store them in a `std::set` that keeps them in **decreasing** order (use
`std::greater<int>` as the comparator).

**Input:** `n`, then `n` integers.
**Output:** the distinct values from largest to smallest, separated by single spaces, then
`distinct: K` on a second line.

```cpp starter
#include <functional>
#include <iostream>
#include <set>

int main() {
    int n;
    std::cin >> n;
    std::set<int> s;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        s.insert(x);
    }
    for (int x : s) std::cout << x << ' ';
    std::cout << '\n' << "distinct: " << s.size() << '\n';
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <set>

int main() {
    int n;
    std::cin >> n;
    std::set<int, std::greater<int>> s;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        s.insert(x);
    }
    bool first = true;
    for (int x : s) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << '\n' << "distinct: " << s.size() << '\n';
}
```

```hint
The comparator is the second template argument: `std::set<int, std::greater<int>>`.
```

```stdin
7
4 1 4 9 -2 1 0
```

```expected
9 4 1 0 -2
distinct: 5
```

```stdin
3
5 5 5
```

```expected hidden
5
distinct: 1
```

```stdin
0
```

```expected hidden

distinct: 0
```

```checks
must std::set\s*<\s*int\s*,\s*std::greater :: Use std::set<int, std::greater<int>>.
```
:::

:::exercise New or seen {easy}
Read words until the input ends. For each word, print `new` if this is the first time it appears and
`seen` otherwise. Use a `std::set` and the `bool` returned by `insert` (don't search separately).

**Input:** words separated by whitespace.
**Output:** one line per input word: `<word> new` or `<word> seen`. After all words, a final line
`unique: N` with the number of distinct words.

```cpp starter
#include <iostream>
#include <set>
#include <string>

int main() {
    std::set<std::string> seen;
    std::string w;
    while (std::cin >> w) {
        seen.insert(w);
        std::cout << w << " new\n";
    }
    std::cout << "unique: " << seen.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <set>
#include <string>

int main() {
    std::set<std::string> seen;
    std::string w;
    while (std::cin >> w) {
        auto [it, inserted] = seen.insert(w);
        std::cout << *it << (inserted ? " new" : " seen") << '\n';
    }
    std::cout << "unique: " << seen.size() << '\n';
}
```

```hint
`auto [it, inserted] = seen.insert(w);` and then check `inserted`. (Or use `.second` on the returned pair.)
```

```stdin
to be or not to be
```

```expected
to new
be new
or new
not new
to seen
be seen
unique: 4
```

```stdin
echo echo echo
```

```expected hidden
echo new
echo seen
echo seen
unique: 1
```

```stdin
A a A
```

```expected hidden
A new
a new
A seen
unique: 2
```

```checks
must std::set :: Use a std::set.
must \.second|\[\s*\w+\s*,\s*\w+\s*\]\s*=\s*\w+\.insert :: Use the bool returned by insert.
mustnot \.(find|count|contains)\s*\( :: Don't search separately: use what insert returns.
```
:::

:::exercise Closest at least {medium}
Read a set of numbers, then answer queries: for each query `x`, print the smallest number in the set that
is **greater than or equal to** `x`, or `none` if there isn't one. Use `lower_bound`.

**Input:** `n` and `n` integers (may contain duplicates); then `q` and `q` query integers.
**Output:** one line per query.

```cpp starter
#include <iostream>
#include <set>

int main() {
    int n;
    std::cin >> n;
    std::set<int> s;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        s.insert(x);
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        int x;
        std::cin >> x;
        std::cout << "none\n";
    }
}
```

```cpp solution
#include <iostream>
#include <set>

int main() {
    int n;
    std::cin >> n;
    std::set<int> s;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        s.insert(x);
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        int x;
        std::cin >> x;
        auto it = s.lower_bound(x);
        if (it == s.end()) std::cout << "none\n";
        else std::cout << *it << '\n';
    }
}
```

```hint
`s.lower_bound(x)` returns an iterator to the first element `>= x`, or `s.end()` if every element is smaller.
```

```stdin
5 10 30 20 50 40
4 25 30 51 -100
```

```expected
30
30
none
10
```

```stdin
0
2 1 2
```

```expected hidden
none
none
```

```stdin
3 -5 0 5
4 5 6 -5 -6
```

```expected hidden
5
none
-5
-5
```

```checks
must \.lower_bound\s*\( :: Use the set's lower_bound member.
```
:::

:::exercise Ticket pool {medium}
A `std::multiset<int>` holds ticket numbers (duplicates allowed). Process commands until the input ends:

- `add X`: add one ticket `X`.
- `use X`: remove **one** ticket `X` if there is one (do nothing otherwise).
- `void X`: remove **all** tickets `X`.
- `count X`: print how many tickets `X` there are.

**Input:** one command per line.
**Output:** a line for each `count` command, then finally all remaining tickets in increasing order
separated by single spaces (or `empty`).

```cpp starter
#include <iostream>
#include <set>
#include <string>

int main() {
    std::multiset<int> tickets;
    std::string cmd;
    int x;
    while (std::cin >> cmd >> x) {
        if (cmd == "add") tickets.insert(x);
        else if (cmd == "count") std::cout << tickets.count(x) << '\n';
        else tickets.erase(x);
    }
    for (int t : tickets) std::cout << t << ' ';
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <set>
#include <string>

int main() {
    std::multiset<int> tickets;
    std::string cmd;
    int x;
    while (std::cin >> cmd >> x) {
        if (cmd == "add") {
            tickets.insert(x);
        } else if (cmd == "use") {
            auto it = tickets.find(x);
            if (it != tickets.end()) tickets.erase(it);
        } else if (cmd == "void") {
            tickets.erase(x);
        } else if (cmd == "count") {
            std::cout << tickets.count(x) << '\n';
        }
    }
    if (tickets.empty()) {
        std::cout << "empty\n";
        return 0;
    }
    bool first = true;
    for (int t : tickets) {
        if (!first) std::cout << ' ';
        std::cout << t;
        first = false;
    }
    std::cout << '\n';
}
```

```hint
`tickets.erase(x)` removes **every** copy. To remove just one, find it first and erase the iterator:
`auto it = tickets.find(x); if (it != tickets.end()) tickets.erase(it);`.
```

```stdin
add 5
add 5
add 3
add 5
count 5
use 5
count 5
void 3
add 1
count 3
```

```expected
3
2
0
1 5 5
```

```stdin
use 4
add 2
void 2
count 2
```

```expected hidden
0
empty
```

```stdin
add 1
add 1
use 1
use 1
use 1
count 1
add -2
add -2
void 3
count -2
```

```expected hidden
0
2
-2 -2
```

```checks
must std::multiset :: Use a std::multiset.
must \.find\s*\( :: Remove a single copy via find + erase(iterator).
```
:::

:::exercise Room booking {hard}
A meeting room is booked in half-open time intervals `[start, end)`: a booking `[1, 3)` ends exactly
when `[3, 5)` begins, so those two **don't** overlap. Keep the bookings in a
`std::set<std::pair<int, int>>` (pairs sort by start, then end) and process commands:

| Command | Output |
| --- | --- |
| `book S E` | `invalid` if `S >= E`; otherwise `conflict with [a, b)` if it overlaps an existing booking (report the overlapping booking with the **smallest start**); otherwise add it and print `booked [S, E)` |
| `cancel S` | remove the booking that starts at `S` and print `cancelled [S, E)`, or `no booking at S` |
| `free T` | `free` if no booking contains time `T`, otherwise `busy [a, b)` |
| `list` | all bookings in order, separated by single spaces, or `(none)` |

There can be 200 000 commands, so each must be O(log n): use `lower_bound`/`upper_bound` and look at
the **neighbors** of the position where a new booking would go, instead of scanning every booking.

**Input:** one command per line until the input ends (times are integers, possibly negative).
**Output:** one line per command, as above.

```cpp starter
#include <iostream>
#include <set>
#include <string>
#include <utility>

int main() {
    std::set<std::pair<int, int>> bookings;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "book") {
            int s, e;
            std::cin >> s >> e;
            bookings.insert({s, e});
            std::cout << "booked [" << s << ", " << e << ")\n";
        }
        // cancel, free, list
    }
}
```

```cpp solution
#include <climits>
#include <iostream>
#include <iterator>
#include <set>
#include <string>
#include <utility>

using Booking = std::pair<int, int>;

std::string text(const Booking& b) {
    return "[" + std::to_string(b.first) + ", " + std::to_string(b.second) + ")";
}

int main() {
    std::set<Booking> bookings;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "book") {
            int s, e;
            std::cin >> s >> e;
            if (s >= e) {
                std::cout << "invalid\n";
                continue;
            }
            auto next = bookings.lower_bound({s, INT_MIN});   // first booking starting at >= s
            // Bookings never overlap each other, so if the one before overlaps, it has the smallest start.
            if (next != bookings.begin() && std::prev(next)->second > s) {
                std::cout << "conflict with " << text(*std::prev(next)) << '\n';
            } else if (next != bookings.end() && next->first < e) {
                std::cout << "conflict with " << text(*next) << '\n';
            } else {
                bookings.insert({s, e});
                std::cout << "booked " << text({s, e}) << '\n';
            }
        } else if (cmd == "cancel") {
            int s;
            std::cin >> s;
            auto it = bookings.lower_bound({s, INT_MIN});
            if (it == bookings.end() || it->first != s) {
                std::cout << "no booking at " << s << '\n';
            } else {
                std::cout << "cancelled " << text(*it) << '\n';
                bookings.erase(it);
            }
        } else if (cmd == "free") {
            int t;
            std::cin >> t;
            auto it = bookings.upper_bound({t, INT_MAX});      // first booking starting after t
            if (it != bookings.begin() && std::prev(it)->second > t) {
                std::cout << "busy " << text(*std::prev(it)) << '\n';
            } else {
                std::cout << "free\n";
            }
        } else if (cmd == "list") {
            if (bookings.empty()) std::cout << "(none)";
            bool first = true;
            for (const auto& b : bookings) {
                if (!first) std::cout << ' ';
                std::cout << text(b);
                first = false;
            }
            std::cout << '\n';
        }
    }
}
```

```hint
Because bookings never overlap each other, a new booking `[s, e)` can only collide with two
candidates: the booking just **before** position `lower_bound({s, INT_MIN})` (does it end after `s`?)
and the booking **at** that position (does it start before `e`?).
```

```hint
Two intervals `[a, b)` and `[c, d)` overlap exactly when `a < d && c < b`. Touching ends (`b == c`) is
not an overlap.
```

```hint
For `free T`, the only booking that can contain `T` is the last one starting at or before `T`:
`std::prev(bookings.upper_bound({t, INT_MAX}))`, if that exists.
```

```stdin
book 10 20
book 20 30
book 5 10
book 15 25
book 0 100
list
free 20
free 30
```

```expected
booked [10, 20)
booked [20, 30)
booked [5, 10)
conflict with [10, 20)
conflict with [5, 10)
[5, 10) [10, 20) [20, 30)
busy [20, 30)
free
```

```stdin
book 5 5
book 7 3
cancel 4
list
free 0
```

```expected
invalid
invalid
no booking at 4
(none)
free
```

```stdin
book 1 5
book 10 15
book 6 9
book 4 7
book 8 11
cancel 6
book 4 7
book 5 10
list
cancel 1
cancel 1
free 4
free 5
free -3
```

```expected hidden
booked [1, 5)
booked [10, 15)
booked [6, 9)
conflict with [1, 5)
conflict with [6, 9)
cancelled [6, 9)
conflict with [1, 5)
booked [5, 10)
[1, 5) [5, 10) [10, 15)
cancelled [1, 5)
no booking at 1
free
busy [5, 10)
free
```

```stdin
book -10 -5
book -6 -4
book -5 0
book -20 -10
list
free -10
free -11
cancel -5
book -4 1
list
```

```expected hidden
booked [-10, -5)
conflict with [-10, -5)
booked [-5, 0)
booked [-20, -10)
[-20, -10) [-10, -5) [-5, 0)
busy [-10, -5)
busy [-20, -10)
cancelled [-5, 0)
booked [-4, 1)
[-20, -10) [-10, -5) [-4, 1)
```

```checks
must std::set\s*< :: Keep the bookings in a std::set.
must std::pair\s*<\s*int\s*,\s*int\s*> :: Store each booking as a std::pair<int, int>.
must lower_bound|upper_bound :: Use lower_bound / upper_bound to find the neighbors.
```
:::
