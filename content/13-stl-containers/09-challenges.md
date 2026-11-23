---
title: "STL Containers & Iterators: Challenges"
summary: Hard, interview-style problems that make you pick and combine containers, from an LRU cache and Dijkstra's algorithm to sliding windows and topological ordering.
---

These problems are meant to be **hard**. They are classic interview and contest tasks, and each one is
really a question of **choosing the right containers** and combining them: a list plus a hash map, a
priority queue plus a graph, a deque that holds indices. You get a precise specification, an example
and a bare skeleton; the design is up to you. Hidden tests cover the edge cases, and the constraints
tell you how fast the solution has to be.

Try each problem on your own before opening the hints. If you're stuck, ask yourself which operations
you need to be fast, then look up which container gives you exactly those in the "Choosing a container"
lesson.

## Warm-up: predict the output

:::quiz
What does this print (C++17 or later)?

```cpp
std::map<std::string, std::size_t> m{{"b", 1}};
if (m["a"] == 0) m["c"] = m.size();
for (const auto& [k, v] : m) std::cout << k << v << ' ';
```

- [ ] `b1`
- [ ] `a0 b1 c3`
- [x] `a0 b1 c2`
- [ ] `b1 c1`

`m["a"]` **inserts** `"a"` with value `0`, so the condition is true and the map has 2 elements. In an
assignment, C++17 evaluates the right side **before** the left side, so `m.size()` is `2` before
`m["c"]` inserts the third key. Iteration is sorted by key: `a0 b1 c2`.
:::

:::quiz
What does this print?

```cpp
struct ByLen {
    bool operator()(const std::string& a, const std::string& b) const { return a.size() < b.size(); }
};

std::set<std::string, ByLen> s{"pear", "fig", "kiwi", "apple", "plum"};
std::cout << s.size() << ' ' << *s.begin() << ' ' << s.count("lime");
```

- [ ] `5 fig 0`
- [x] `3 fig 1`
- [ ] `3 apple 0`
- [ ] `4 fig 1`

A set treats two elements as **equal** when neither comes before the other. With `ByLen`, every
4-letter word is "equal" to `pear`, so `kiwi` and `plum` are dropped and the set holds `fig`, `pear`,
`apple`. And `s.count("lime")` is `1`: `lime` is equivalent to `pear`, even though it was never inserted.
:::

## Problems

:::exercise LRU cache {hard}
A **least-recently-used (LRU) cache** holds at most `C` entries. When it is full and a new key arrives,
it evicts the entry that was **used least recently**. Both reading (`get`) and writing (`put`) count as
using an entry.

Implement it with every operation in **O(1)**: a `std::list<std::pair<std::string, int>>` keeps the
entries ordered from most to least recently used, and a
`std::unordered_map<std::string, std::list<...>::iterator>` finds any key's list node instantly. Moving a
node to the front is a `splice`: no copying, and every iterator stays valid.

**Input:** the capacity `C` (`C >= 1`), then commands until the input ends:

| Command | Effect / output |
| --- | --- |
| `get K` | prints the value of `K` (and marks it most recent), or `miss` |
| `put K V` | sets `K` to `V` and marks it most recent; if `K` is new and the cache is full, first evicts the least recently used entry and prints `evict K2` |
| `dump` | prints the entries from most to least recent as `K=V`, separated by single spaces, or `(empty)` |

Keys are words, values are integers.

```cpp starter
#include <iostream>
#include <list>
#include <string>
#include <unordered_map>
#include <utility>

int main() {
    std::size_t capacity;
    std::cin >> capacity;
    std::string cmd;
    while (std::cin >> cmd) {
    }
}
```

```cpp solution
#include <iostream>
#include <list>
#include <string>
#include <unordered_map>
#include <utility>

class LruCache {
public:
    explicit LruCache(std::size_t capacity) : capacity_(capacity) {}

    // returns nullptr on a miss
    const int* get(const std::string& key) {
        auto it = index_.find(key);
        if (it == index_.end()) return nullptr;
        order_.splice(order_.begin(), order_, it->second);   // move the node to the front, O(1)
        return &it->second->second;
    }

    // returns the evicted key, or an empty string
    std::string put(const std::string& key, int value) {
        auto it = index_.find(key);
        if (it != index_.end()) {
            it->second->second = value;
            order_.splice(order_.begin(), order_, it->second);
            return "";
        }
        std::string evicted;
        if (order_.size() == capacity_) {
            evicted = order_.back().first;
            index_.erase(evicted);
            order_.pop_back();
        }
        order_.emplace_front(key, value);
        index_[key] = order_.begin();
        return evicted;
    }

    const std::list<std::pair<std::string, int>>& entries() const { return order_; }

private:
    std::size_t capacity_;
    std::list<std::pair<std::string, int>> order_;   // front = most recently used
    std::unordered_map<std::string, std::list<std::pair<std::string, int>>::iterator> index_;
};

int main() {
    std::size_t capacity;
    std::cin >> capacity;
    LruCache cache(capacity);
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "get") {
            std::string key;
            std::cin >> key;
            const int* value = cache.get(key);
            if (value) std::cout << *value << '\n';
            else std::cout << "miss\n";
        } else if (cmd == "put") {
            std::string key;
            int value;
            std::cin >> key >> value;
            std::string evicted = cache.put(key, value);
            if (!evicted.empty()) std::cout << "evict " << evicted << '\n';
        } else if (cmd == "dump") {
            if (cache.entries().empty()) std::cout << "(empty)";
            bool first = true;
            for (const auto& [key, value] : cache.entries()) {
                if (!first) std::cout << ' ';
                std::cout << key << '=' << value;
                first = false;
            }
            std::cout << '\n';
        }
    }
}
```

```hint
Front of the list = most recently used, back = least recently used. "Use" an entry by moving its node
to the front: `order.splice(order.begin(), order, it)` relinks the node without invalidating `it`.
```

```hint
When evicting, read the key from `order.back()`, erase it from the hash map **and** pop it from the list.
Forgetting the map leaves an iterator to a destroyed node behind.
```

```hint
Updating an existing key never evicts anything, even when the cache is full.
```

```stdin
2
put a 1
put b 2
get a
put c 3
get b
dump
```

```expected
1
evict b
miss
c=3 a=1
```

```stdin
1
get x
put x 5
put x 6
dump
put y 7
get x
dump
```

```expected
miss
x=6
evict x
miss
y=7
```

```stdin
3
dump
put a 1
put b 2
put c 3
get a
get b
put d 4
put c 30
put e 5
dump
get d
get a
```

```expected hidden
(empty)
1
2
evict c
evict a
evict b
e=5 c=30 d=4
4
miss
```

```stdin
2
put k 1
put k 2
put j 3
get k
put i 4
dump
get j
```

```expected hidden
2
evict j
i=4 k=2
miss
```

```checks
must std::list :: Keep the usage order in a std::list.
must std::unordered_map :: Find nodes with a std::unordered_map.
must splice :: Move used entries to the front with splice.
```
:::

:::exercise Shortest routes {hard}
A road network has `n` junctions (numbered `0` to `n - 1`) and `m` **one-way** roads, each with a
positive length. From a start junction `s`, find for every junction:

1. the length of the shortest route from `s`,
2. **how many different** shortest routes there are (two routes differ if they use a different
   sequence of roads; parallel roads between the same junctions count separately).

Use **Dijkstra's algorithm**: an adjacency list (`std::vector<std::vector<std::pair<int, int>>>`) and a
min-priority-queue of `(distance, junction)` pairs. When a road gives a junction a strictly shorter
distance, its route count is replaced; when it gives an **equal** distance, the counts add up.

**Input:** `n m s`, then `m` lines `u v w` (a road from `u` to `v` of length `w`, `1 <= w <= 10^9`).
`n <= 100000`, `m <= 200000`, so an O(n²) algorithm is too slow.
**Output:** one line per junction `v`, in order: `v: D (K routes)`, or `v: unreachable`. The start
itself has distance `0` and `1` route. Route counts fit in a `long long`.

```cpp starter
#include <functional>
#include <iostream>
#include <queue>
#include <utility>
#include <vector>

int main() {
    int n, m, s;
    std::cin >> n >> m >> s;
    for (int i = 0; i < m; ++i) {
        int u, v, w;
        std::cin >> u >> v >> w;
    }
    for (int v = 0; v < n; ++v) std::cout << v << ": unreachable\n";
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <queue>
#include <utility>
#include <vector>

int main() {
    int n, m, s;
    std::cin >> n >> m >> s;
    std::vector<std::vector<std::pair<int, int>>> adj(n);   // adj[u] = {(v, w), ...}
    for (int i = 0; i < m; ++i) {
        int u, v, w;
        std::cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }

    const long long UNSEEN = -1;   // marks "not reached yet"
    std::vector<long long> dist(n, UNSEEN), ways(n, 0);
    using Entry = std::pair<long long, int>;                 // (distance, junction)
    std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> pq;
    dist[s] = 0;
    ways[s] = 1;
    pq.push({0, s});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d != dist[u]) continue;                          // stale entry: u was improved later
        for (auto [v, w] : adj[u]) {
            long long nd = d + w;
            if (dist[v] == UNSEEN || nd < dist[v]) {
                dist[v] = nd;
                ways[v] = ways[u];
                pq.push({nd, v});
            } else if (nd == dist[v]) {
                ways[v] += ways[u];
            }
        }
    }

    for (int v = 0; v < n; ++v) {
        if (dist[v] == UNSEEN) std::cout << v << ": unreachable\n";
        else std::cout << v << ": " << dist[v] << " (" << ways[v] << " routes)\n";
    }
}
```

```hint
Push `(0, s)`. Repeatedly pop the closest junction; if its popped distance is larger than the best
known one, skip it (it's an outdated entry). Otherwise relax all its roads.
```

```hint
The counts are correct when a junction is popped for good, because all lengths are positive: every
route into it comes from a junction with a strictly smaller distance, popped earlier.
```

```hint
Distances can reach `10^9 * 10^5`: use `long long`, and make the queue a min-heap with
`std::greater<std::pair<long long, int>>`.
```

```stdin
4 5 0
0 1 1
0 2 1
1 3 1
2 3 1
0 3 3
```

```expected
0: 0 (1 routes)
1: 1 (1 routes)
2: 1 (1 routes)
3: 2 (2 routes)
```

```stdin
3 1 1
1 2 5
```

```expected
0: unreachable
1: 0 (1 routes)
2: 5 (1 routes)
```

```stdin
5 7 0
0 1 2
0 1 2
1 2 3
0 2 6
2 3 1
3 2 1
4 0 1
```

```expected hidden
0: 0 (1 routes)
1: 2 (2 routes)
2: 5 (2 routes)
3: 6 (2 routes)
4: unreachable
```

```stdin
3 3 0
0 1 1000000000
1 2 1000000000
0 2 1999999999
```

```expected hidden
0: 0 (1 routes)
1: 1000000000 (1 routes)
2: 1999999999 (1 routes)
```

```stdin
1 0 0
```

```expected hidden
0: 0 (1 routes)
```

```stdin
4 6 0
0 1 5
0 2 2
2 1 2
1 3 1
2 3 5
0 3 6
```

```expected hidden
0: 0 (1 routes)
1: 4 (1 routes)
2: 2 (1 routes)
3: 5 (1 routes)
```

```checks
must std::priority_queue :: Use a std::priority_queue.
must std::greater :: Make it a min-heap with std::greater.
```
:::

:::exercise Sliding window extremes {hard}
A sensor reports `n` readings. For every window of `k` consecutive readings (there are `n - k + 1` of
them), report the **maximum** and the **minimum** in that window.

Recomputing each window costs O(n·k): for `n = 200000` and `k = 100000` that's billions of steps.
The classic O(n) solution keeps a `std::deque<int>` of **indices** whose values are
decreasing (for the maximum):

- before pushing index `i` at the back, pop from the back every index whose value is `<=` the new value
  (they can never be a maximum again),
- pop from the front the index that has slid out of the window (`front <= i - k`),
- the front is then the index of the current window's maximum.

A second deque with increasing values gives the minimum.

**Input:** `n k` (`1 <= k <= n`), then `n` integers.
**Output:** two lines, `max:` and `min:`, each followed by the `n - k + 1` values, every value
preceded by a space.

Example: `1 3 -1 -3 5 3 6 7` with `k = 3` gives `max: 3 3 5 5 6 7` and `min: -1 -3 -3 -3 3 3`.

```cpp starter
#include <deque>
#include <iostream>
#include <vector>

int main() {
    int n, k;
    std::cin >> n >> k;
    std::vector<int> a(n);
    for (int& x : a) std::cin >> x;
    std::cout << "max:\nmin:\n";
}
```

```cpp solution
#include <deque>
#include <iostream>
#include <vector>

int main() {
    int n, k;
    std::cin >> n >> k;
    std::vector<int> a(n);
    for (int& x : a) std::cin >> x;

    std::deque<int> hi, lo;            // indices; values decreasing in hi, increasing in lo
    std::vector<int> maxima, minima;
    for (int i = 0; i < n; ++i) {
        while (!hi.empty() && a[hi.back()] <= a[i]) hi.pop_back();
        while (!lo.empty() && a[lo.back()] >= a[i]) lo.pop_back();
        hi.push_back(i);
        lo.push_back(i);
        if (hi.front() <= i - k) hi.pop_front();
        if (lo.front() <= i - k) lo.pop_front();
        if (i >= k - 1) {
            maxima.push_back(a[hi.front()]);
            minima.push_back(a[lo.front()]);
        }
    }

    std::cout << "max:";
    for (int x : maxima) std::cout << ' ' << x;
    std::cout << "\nmin:";
    for (int x : minima) std::cout << ' ' << x;
    std::cout << '\n';
}
```

```hint
Store **indices** in the deque, not values: you need them to tell when an element has left the window.
```

```hint
Each index is pushed once and popped at most once, so the whole pass is O(n) even though there are
inner `while` loops.
```

```hint
The first complete window ends at index `k - 1`: start reporting from there.
```

```stdin
8 3
1 3 -1 -3 5 3 6 7
```

```expected
max: 3 3 5 5 6 7
min: -1 -3 -3 -3 3 3
```

```stdin
3 1
5 -5 0
```

```expected
max: 5 -5 0
min: 5 -5 0
```

```stdin
5 5
2 9 -4 9 1
```

```expected hidden
max: 9
min: -4
```

```stdin
6 2
4 4 4 4 4 4
```

```expected hidden
max: 4 4 4 4 4
min: 4 4 4 4 4
```

```stdin
7 3
7 6 5 4 3 2 1
```

```expected hidden
max: 7 6 5 4 3
min: 5 4 3 2 1
```

```stdin
1 1
-1000000000
```

```expected hidden
max: -1000000000
min: -1000000000
```

```checks
must std::deque :: Use a std::deque of indices.
mustnot std::(max_element|min_element|minmax_element|multiset|priority_queue) :: Use the monotonic deque trick instead.
```
:::

:::exercise Anagram groups {hard}
Two words are **anagrams** if one is a rearrangement of the other's letters (`listen` and `silent`).
Group the input words into anagram classes.

The trick: give every word a **signature**, its letters sorted (`listen` and `silent` both become
`eilnst`), and use it as a key in a `std::unordered_map`. Each group should hold its distinct words,
sorted (a `std::set<std::string>` does both).

**Input:** words of lowercase letters, until the input ends. A word may appear several times.
**Output:** one line per group: `K: word word ...`, where `K` is the number of **distinct** words in the
group and the words are in alphabetical order. Order the groups by size, **largest first**, and groups
of equal size alphabetically by their first word. A hash map has no defined order, so collect the groups
into a vector and sort them yourself.

Example: `listen tea silent eat enlist ate tan nat tea` prints

```
3: ate eat tea
3: enlist listen silent
2: nat tan
```

```cpp starter
#include <iostream>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::string w;
    while (std::cin >> w) {
        std::cout << "1: " << w << '\n';
    }
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::unordered_map<std::string, std::set<std::string>> groups;
    std::string w;
    while (std::cin >> w) {
        std::string key = w;
        std::sort(key.begin(), key.end());
        groups[key].insert(w);
    }

    std::vector<std::set<std::string>> result;
    for (auto& [key, words] : groups) result.push_back(std::move(words));
    std::sort(result.begin(), result.end(), [](const auto& a, const auto& b) {
        if (a.size() != b.size()) return a.size() > b.size();
        return *a.begin() < *b.begin();
    });

    for (const auto& g : result) {
        std::cout << g.size() << ':';
        for (const auto& word : g) std::cout << ' ' << word;
        std::cout << '\n';
    }
}
```

```hint
`std::string key = w; std::sort(key.begin(), key.end());` builds the signature. `groups[key].insert(w)`
creates the group on first use, and the set drops repeated words.
```

```hint
To sort the groups, copy (or move) the sets into a `std::vector<std::set<std::string>>` and sort with
a comparator: larger `size()` first, then compare `*a.begin()` (each set's smallest word).
```

```hint
Two different groups can never share a first word (a word belongs to exactly one group), so this order
is complete.
```

```stdin
listen tea silent eat enlist ate tan nat tea
```

```expected
3: ate eat tea
3: enlist listen silent
2: nat tan
```

```stdin
abc
```

```expected
1: abc
```

```stdin
```

```expected hidden
```

```stdin
a a a b ab ba ab
```

```expected hidden
2: ab ba
1: a
1: b
```

```stdin
zz yx xy dcba abcd bcda q
```

```expected hidden
3: abcd bcda dcba
2: xy yx
1: q
1: zz
```

```checks
must std::unordered_map :: Group the words in a std::unordered_map.
must sort\s*\( :: Sort the signatures and the groups.
```
:::

:::exercise Course order {hard}
A university lists prerequisites: `algebra calculus` means `algebra` must be taken **before**
`calculus`. Find an order in which to take **every** course mentioned, such that each course comes
after all of its prerequisites. Many orders may be valid, so use this rule to make the answer unique:
**whenever several courses are available, take the alphabetically smallest one next.**

This is a **topological sort** (Kahn's algorithm):

1. Count, for every course, how many prerequisites it still waits for (its *in-degree*), and remember
   which courses each one unlocks (a `std::map<std::string, std::vector<std::string>>`).
2. Put every course with in-degree 0 into a container that always gives you the smallest one: a
   `std::priority_queue` with `std::greater<>`, or a `std::set`.
3. Repeatedly take the smallest available course, append it to the order, and decrease the in-degree
   of every course it unlocks; those that reach 0 become available.

If the prerequisites contain a **cycle** (`a b` and `b a`), some courses never become available.

**Input:** `m`, then `m` lines `before after` (course names are words; a pair may repeat, and
`x x` is a course that requires itself).
**Output:** `order:` followed by the scheduled courses, each preceded by a space. If some courses could
not be scheduled, a second line `stuck:` followed by those courses in alphabetical order.

```cpp starter
#include <iostream>
#include <map>
#include <queue>
#include <string>
#include <vector>

int main() {
    int m;
    std::cin >> m;
    for (int i = 0; i < m; ++i) {
        std::string before, after;
        std::cin >> before >> after;
    }
    std::cout << "order:\n";
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <map>
#include <queue>
#include <string>
#include <vector>

int main() {
    int m;
    std::cin >> m;
    std::map<std::string, std::vector<std::string>> unlocks;
    std::map<std::string, int> waiting;                 // in-degree of every course mentioned
    for (int i = 0; i < m; ++i) {
        std::string before, after;
        std::cin >> before >> after;
        unlocks[before].push_back(after);
        waiting[before];                                // make sure it exists (in-degree 0 so far)
        ++waiting[after];
    }

    std::priority_queue<std::string, std::vector<std::string>, std::greater<>> ready;
    for (const auto& [course, count] : waiting)
        if (count == 0) ready.push(course);

    std::vector<std::string> order;
    while (!ready.empty()) {
        std::string course = ready.top();
        ready.pop();
        order.push_back(course);
        for (const auto& next : unlocks[course])
            if (--waiting[next] == 0) ready.push(next);
    }

    std::cout << "order:";
    for (const auto& c : order) std::cout << ' ' << c;
    std::cout << '\n';

    if (order.size() < waiting.size()) {
        std::cout << "stuck:";
        for (const auto& [course, count] : waiting)     // a std::map iterates alphabetically
            if (count > 0) std::cout << ' ' << course;
        std::cout << '\n';
    }
}
```

```hint
Make sure courses that only ever appear on the **left** (no prerequisites at all) are in your in-degree
map too, with count 0. `waiting[before];` on a `std::map` inserts it with `0` if it's missing.
```

```hint
A repeated pair adds the edge twice: increment the in-degree twice and store the course twice in the
unlock list, and the counts stay consistent.
```

```hint
After the loop, any course whose in-degree is still above 0 is stuck (it's on a cycle, or depends on
one).
```

```stdin
4
algebra calculus
calculus physics
algebra statistics
art physics
```

```expected
order: algebra art calculus physics statistics
```

```stdin
3
a b
b c
c a
```

```expected
order:
stuck: a b c
```

```stdin
5
z a
y a
x b
a b
b c
```

```expected hidden
order: x y z a b c
```

```stdin
4
base top
loop loop
loop top
base base2
```

```expected hidden
order: base base2
stuck: loop top
```

```stdin
3
p q
p q
q r
```

```expected hidden
order: p q r
```

```checks
must std::priority_queue|std::set :: Keep the available courses in a priority_queue (or set).
must std::map :: Store the prerequisite graph in maps.
```
:::
