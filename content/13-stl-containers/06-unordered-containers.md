---
title: Unordered Containers (Hash Tables)
summary: unordered_set and unordered_map give average O(1) lookups by hashing; learn how hashing works, why there's no order, buckets and load factor, and how to hash your own types.
---

## Faster lookups, no order

`std::set` and `std::map` keep their elements sorted, which costs O(log n) per operation. Very often you
don't care about order. You just want "is this key here?" and "what's its value?" as fast as possible.
That's what the **unordered** containers are for:

| Sorted (tree) | Unordered (hash table) | Header |
| --- | --- | --- |
| `std::set<T>` | `std::unordered_set<T>` | `<unordered_set>` |
| `std::map<K, V>` | `std::unordered_map<K, V>` | `<unordered_map>` |
| `std::multiset<T>` | `std::unordered_multiset<T>` | `<unordered_set>` |
| `std::multimap<K, V>` | `std::unordered_multimap<K, V>` | `<unordered_map>` |

The interface is almost the same as their sorted cousins: `insert`, `emplace`, `try_emplace`, `find`,
`count`, `contains`, `erase`, `[]` and `at` (for the map), iteration, structured bindings. The difference
is the performance and the **order**:

```cpp run
#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, int> population{
        {"Tokyo", 37}, {"Delhi", 33}, {"Shanghai", 29}};
    population["Cairo"] = 22;

    std::cout << "Delhi: " << population["Delhi"] << '\n';
    std::cout << std::boolalpha << population.contains("Paris") << '\n';

    auto it = population.find("Tokyo");
    if (it != population.end()) std::cout << it->first << " has " << it->second << "M\n";

    population.erase("Shanghai");
    std::cout << population.size() << " cities\n";
}
```

```output
Delhi: 33
false
Tokyo has 37M
3 cities
```

Everything about `[]` from the map lesson still applies: it inserts a default value for a missing key.

## How hashing works

A hash table is an array of **buckets**. To store a key, the container:

1. computes a **hash** of the key with a **hash function**: a function that turns the key into a big
   number (a `std::size_t`). Equal keys must always give equal hashes. The standard library provides
   `std::hash<T>` for built-in types, strings, pointers and more.
2. turns the hash into a bucket number, roughly `hash % bucket_count()`,
3. puts the element in that bucket.

To look a key up, it hashes the key, jumps straight to that one bucket, and compares (with `==`) only the
few elements there. No matter how big the table is, that's **O(1) on average**.

```
 key "cat" --hash--> 7310283... % 8 = 3
 buckets:  [0]  [1]  [2]  [3]: "cat", "emu"  [4]  [5]: "dog"  [6]  [7]
```

Two different keys landing in the same bucket is a **collision** ("cat" and "emu" above). A few collisions
are normal. But if many keys pile into one bucket (because of a bad hash function), lookups degrade
toward O(n), the **worst case**.

The container keeps collisions rare by watching its **load factor** = `size() / bucket_count()`, the
average number of elements per bucket. When it exceeds `max_load_factor()` (1.0 by default), the table
**rehashes**: it allocates more buckets and redistributes every element. Like vector's reallocation, this
is expensive but rare, so insertion is O(1) on average. A rehash invalidates all iterators (but not
references to elements).

```cpp run
#include <iostream>
#include <unordered_set>

int main() {
    std::unordered_set<int> s;
    s.reserve(1000);          // make room for 1000 elements without rehashing
    for (int i = 0; i < 1000; ++i) s.insert(i * 7);

    std::cout << std::boolalpha;
    std::cout << (s.bucket_count() >= 1000) << '\n';
    std::cout << (s.load_factor() <= s.max_load_factor()) << '\n';
    std::cout << s.max_load_factor() << '\n';
}
```

```output
true
true
1
```

(Exact bucket counts differ between library implementations, so programs shouldn't depend on them.)

## No order: and why this matters for your output

Iterating an unordered container visits elements in an **unspecified order** that depends on the hash
function, the bucket count, and the insertion history. It can differ between compilers, library versions,
and even after inserting one more element. So **never rely on iteration order**.

If you need sorted output, copy the elements into a vector and sort it (or use `std::map`/`std::set` in
the first place):

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

int main() {
    std::unordered_map<std::string, int> votes;
    for (std::string v : {"pear", "apple", "pear", "fig", "apple", "pear"}) ++votes[v];

    // Copy the pairs into a vector so we can sort them
    std::vector<std::pair<std::string, int>> rows(votes.begin(), votes.end());
    std::sort(rows.begin(), rows.end());          // pairs sort by .first, then .second

    for (const auto& [fruit, count] : rows) std::cout << fruit << ' ' << count << '\n';
}
```

```output
apple 2
fig 1
pear 3
```

This is also the rule for exercises in this course: whenever a container has no defined order, sort before
printing so the output is deterministic.

Unordered containers also have **no** `lower_bound`, `upper_bound`, or "smallest element". If you need
those, you need a sorted container.

## Hashing your own types

`std::unordered_set<Point>` for your own `struct Point` doesn't compile out of the box: the library
doesn't know how to hash a `Point`, or how to compare two of them.

```cpp compile-error
#include <unordered_set>

struct Point { int x, y; };

int main() {
    std::unordered_set<Point> pts;   // error: use of deleted function 'std::hash<Point>::hash()'
    pts.insert({1, 2});
}
```

An unordered container needs two things for a key type:

1. **equality**: `operator==` (or a custom equality functor),
2. **a hash function**: a functor whose `operator()` returns a `std::size_t`, consistent with equality
   (equal keys must hash equally).

The usual way to hash a struct is to hash each member with `std::hash` and **combine** the results. A
simple, decent combination mixes the bits with a multiplier and shifts:

```cpp run
#include <cstddef>
#include <functional>
#include <iostream>
#include <unordered_set>

struct Point {
    int x, y;
    bool operator==(const Point&) const = default;   // C++20: compare all members
};

// Option 1: a separate hash functor, passed as a template argument
struct PointHash {
    std::size_t operator()(const Point& p) const {
        std::size_t h1 = std::hash<int>{}(p.x);
        std::size_t h2 = std::hash<int>{}(p.y);
        return h1 ^ (h2 * 0x9e3779b97f4a7c15ULL + (h1 << 6) + (h1 >> 2));
    }
};

int main() {
    std::unordered_set<Point, PointHash> visited;
    visited.insert({0, 0});
    visited.insert({1, 2});
    visited.insert({0, 0});                       // duplicate: ignored

    std::cout << visited.size() << '\n';
    std::cout << std::boolalpha << visited.contains({1, 2}) << ' ' << visited.contains({2, 1}) << '\n';
}
```

```output
2
true false
```

Note `std::hash<int>{}(p.x)`: `std::hash<int>{}` creates a hash object, and `(p.x)` calls it.

The alternative is to **specialize `std::hash`** for your type (a full class template specialization, from
the templates module). Then you don't have to pass the hash as a template argument:

```cpp run
#include <cstddef>
#include <functional>
#include <iostream>
#include <string>
#include <unordered_map>

struct Employee {
    std::string name;
    int id;
    bool operator==(const Employee&) const = default;
};

// Option 2: teach std::hash about Employee
template <>
struct std::hash<Employee> {
    std::size_t operator()(const Employee& e) const {
        return std::hash<std::string>{}(e.name) ^ (std::hash<int>{}(e.id) << 1);
    }
};

int main() {
    std::unordered_map<Employee, double> salary;      // uses std::hash<Employee> automatically
    salary[{"Ada", 1}] = 5000;
    salary[{"Linus", 2}] = 4500;
    std::cout << salary.at({"Ada", 1}) << ' ' << salary.size() << '\n';
}
```

```output
5000 2
```

Never print hash values in programs that need stable output: they're implementation-specific (and some
implementations randomize string hashing per run).

## Ordered vs unordered: how to choose

| | `std::map` / `std::set` | `std::unordered_map` / `std::unordered_set` |
| --- | --- | --- |
| Lookup / insert / erase | O(log n) guaranteed | O(1) average, O(n) worst case |
| Iteration order | sorted by key | unspecified |
| Range queries (`lower_bound`, min, max) | yes | no |
| Key requirements | `<` (or a comparator) | `==` and a hash |
| Memory | one node per element | nodes plus a bucket array |

Default to the unordered version when you only look things up by exact key and order doesn't matter (it's
usually faster for large containers). Use the sorted version when you need sorted iteration, nearest-value
queries, or guaranteed worst-case performance.

## Common mistakes

- **Printing an unordered container directly** and expecting a particular order. Sort first.
- **Missing hash or `==`** for your own key type.
- **Hash inconsistent with equality**: if `a == b` but their hashes differ, lookups fail mysteriously.
- **A hash that ignores some members**, or always returns the same value: correct, but every key collides
  and everything becomes O(n).
- **Keeping iterators across insertions**: a rehash invalidates them.

:::quiz
What is the average-case time for `find` in an `std::unordered_map` with n elements?

- [x] O(1)
- [ ] O(log n)
- [ ] O(n)

Hashing jumps directly to one bucket. The worst case (everything in one bucket) is O(n), but with a good
hash that's very unlikely.
:::

:::quiz
Which of these can you do with a `std::set<int>` but **not** with a `std::unordered_set<int>`? (select all that apply)

- [ ] `s.contains(5)`
- [x] `s.lower_bound(5)`
- [x] Iterate the elements in increasing order
- [ ] `s.erase(5)`

Unordered containers have no ordering, so there's no `lower_bound` and no sorted iteration. Lookups,
insertions and erasures by key work on both.
:::

:::exercise Pair with sum {medium}
Read `n` integers and a `target`. Print `yes` if two numbers at **different positions** add up to `target`,
otherwise `no`. Do it in one pass with a `std::unordered_set`: for each number `x`, check whether
`target - x` has already been seen, then remember `x`.

**Input:** `n`, then `n` integers, then `target`.
**Output:** `yes` or `no`.

```cpp starter
#include <iostream>
#include <unordered_set>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int target;
    std::cin >> target;
    std::cout << "no\n";
}
```

```cpp solution
#include <iostream>
#include <unordered_set>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int target;
    std::cin >> target;
    std::unordered_set<int> seen;
    bool found = false;
    for (int x : v) {
        if (seen.contains(target - x)) {
            found = true;
            break;
        }
        seen.insert(x);
    }
    std::cout << (found ? "yes" : "no") << '\n';
}
```

```hint
Check **before** inserting `x`, so a single element can't pair with itself.
```

```stdin
5
3 8 1 9 4
13
```

```expected
yes
```

```stdin
3
5 1 2
10
```

```expected hidden
no
```

```stdin
2
5 5
10
```

```expected hidden
yes
```

```stdin
4
-3 7 -10 2
-8
```

```expected hidden
yes
```

```stdin
1
5
10
```

```expected hidden
no
```

```checks
must std::unordered_set :: Use a std::unordered_set.
```
:::

:::exercise First repeated word {easy}
Read words in order and print the first word that appears for the **second time** (the earliest moment a
repeat happens). Use a `std::unordered_set<std::string>`.

**Input:** words separated by whitespace, until the input ends.
**Output:** the first repeated word, or `none` if every word is distinct.

```cpp starter
#include <iostream>
#include <string>
#include <unordered_set>

int main() {
    std::string w;
    while (std::cin >> w) {
    }
    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>
#include <string>
#include <unordered_set>

int main() {
    std::unordered_set<std::string> seen;
    std::string w;
    while (std::cin >> w) {
        if (!seen.insert(w).second) {
            std::cout << w << '\n';
            return 0;
        }
    }
    std::cout << "none\n";
}
```

```hint
`insert` returns a pair whose `.second` is `false` if the word was already there.
```

```stdin
he said that she said that he
```

```expected
said
```

```stdin
every word here is distinct
```

```expected hidden
none
```

```stdin
a b b a
```

```expected hidden
b
```

```checks
must std::unordered_set :: Use a std::unordered_set.
```
:::

:::exercise Top words {medium}
Count words with a `std::unordered_map<std::string, int>`, then print the `k` most frequent. Since the
hash map has no order, copy the counts into a vector and sort it: higher count first, and for equal counts
alphabetical order.

**Input:** `k`, then words until the input ends.
**Output:** up to `k` lines `word count` (fewer if there are fewer distinct words).

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

int main() {
    int k;
    std::cin >> k;
    std::unordered_map<std::string, int> freq;
    std::string w;
    while (std::cin >> w) ++freq[w];
    // copy into a vector, sort, print the first k
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

bool byCountThenWord(const std::pair<std::string, int>& a, const std::pair<std::string, int>& b) {
    if (a.second != b.second) return a.second > b.second;
    return a.first < b.first;
}

int main() {
    int k;
    std::cin >> k;
    std::unordered_map<std::string, int> freq;
    std::string w;
    while (std::cin >> w) ++freq[w];

    std::vector<std::pair<std::string, int>> rows(freq.begin(), freq.end());
    std::sort(rows.begin(), rows.end(), byCountThenWord);

    for (std::size_t i = 0; i < rows.size() && i < static_cast<std::size_t>(k); ++i) {
        std::cout << rows[i].first << ' ' << rows[i].second << '\n';
    }
}
```

```hint
`std::vector<std::pair<std::string, int>> rows(freq.begin(), freq.end());` copies all pairs.
```

```hint
Pass a comparison function as the third argument to `std::sort`: return `true` when `a` should come first,
i.e. `a.second > b.second`, or equal counts and `a.first < b.first`.
```

```stdin
2
the cat the dog the cat bird
```

```expected
the 3
cat 2
```

```stdin
5
b a c a b
```

```expected hidden
a 2
b 2
c 1
```

```stdin
3
b B a B b
```

```expected hidden
B 2
b 2
a 1
```

```stdin
4
```

```expected hidden
```

```checks
must std::unordered_map :: Count with a std::unordered_map.
must sort\s*\( :: Sort the results before printing.
```
:::

:::exercise Distinct points {medium}
Store 2D points in a `std::unordered_set<Point, PointHash>`, where you write `Point` (with `x`, `y` and
`operator==`) and the hash functor `PointHash` yourself. Then answer membership queries.

**Input:** `n`, then `n` points as `x y`; then `q`, then `q` query points.
**Output:** first line `distinct: D` (number of distinct points); then one line per query, `yes` if the
point was among the input points, otherwise `no`.

```cpp starter
#include <cstddef>
#include <functional>
#include <iostream>
#include <unordered_set>

struct Point {
    int x, y;
};

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        int x, y;
        std::cin >> x >> y;
    }
    std::cout << "distinct: " << n << '\n';
}
```

```cpp solution
#include <cstddef>
#include <functional>
#include <iostream>
#include <unordered_set>

struct Point {
    int x, y;
    bool operator==(const Point&) const = default;
};

struct PointHash {
    std::size_t operator()(const Point& p) const {
        std::size_t h1 = std::hash<int>{}(p.x);
        std::size_t h2 = std::hash<int>{}(p.y);
        return h1 ^ (h2 * 0x9e3779b97f4a7c15ULL + (h1 << 6) + (h1 >> 2));
    }
};

int main() {
    int n;
    std::cin >> n;
    std::unordered_set<Point, PointHash> points;
    for (int i = 0; i < n; ++i) {
        int x, y;
        std::cin >> x >> y;
        points.insert({x, y});
    }
    std::cout << "distinct: " << points.size() << '\n';
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        int x, y;
        std::cin >> x >> y;
        std::cout << (points.contains({x, y}) ? "yes" : "no") << '\n';
    }
}
```

```hint
Give `Point` an `operator==`: `bool operator==(const Point&) const = default;`.
```

```hint
`PointHash` needs `std::size_t operator()(const Point& p) const`. Hash `p.x` and `p.y` with
`std::hash<int>{}` and combine the two results so that `(1, 2)` and `(2, 1)` usually differ.
```

```stdin
4
1 2
3 4
1 2
-5 0
3
1 2
2 1
-5 0
```

```expected
distinct: 3
yes
no
yes
```

```stdin
0
1
0 0
```

```expected hidden
distinct: 0
no
```

```stdin
3
-1 -1
1 1
-1 -1
2
1 1
-1 1
```

```expected hidden
distinct: 2
yes
no
```

```checks
must unordered_set\s*<\s*Point\s*,\s*PointHash\s*> :: Use std::unordered_set<Point, PointHash>.
must operator\s*\(\s*\)\s*\(\s*const\s+Point :: Write PointHash's operator()(const Point&).
must operator\s*== :: Give Point an operator==.
```
:::

:::exercise Subarrays with target sum {hard}
Given `n` integers (possibly negative) and a target `k`, find:

1. how many **contiguous** subarrays (runs `a[i..j]`, at least one element) have a sum of exactly `k`,
2. the length of the **shortest** such subarray.

Checking every `(i, j)` pair is O(n²): too slow for `n = 200000`. Use **prefix sums** and hash maps
for an O(n) solution: with `P(j)` = the sum of the first `j` elements, the run `a[i..j-1]` sums to `k`
exactly when `P(i) == P(j) - k`. So while you walk the array, keep:

- a `std::unordered_map<long long, long long>` counting how many times each prefix sum has occurred,
- a `std::unordered_map<long long, int>` remembering the **latest** position where each prefix sum
  occurred (the latest start gives the shortest run ending here).

**Input:** `n`, then `n` integers (`|a[i]| <= 10^9`), then `k`.
**Output:** `count: C` on the first line, then `shortest: L` or `shortest: none`.

Example: for `1 2 3 -2 2` and `k = 3` the runs are `[1, 2]`, `[3]`, `[2, 3, -2]` and
`[3, -2, 2]`, so the output is `count: 4` and `shortest: 1`.

```cpp starter
#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> a(n);
    for (auto& x : a) std::cin >> x;
    long long k;
    std::cin >> k;
    std::cout << "count: 0\nshortest: none\n";
}
```

```cpp solution
#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> a(n);
    for (auto& x : a) std::cin >> x;
    long long k;
    std::cin >> k;

    std::unordered_map<long long, long long> seen{{0, 1}};   // the empty prefix has sum 0
    std::unordered_map<long long, int> lastPos{{0, 0}};      // ...at position 0
    long long prefix = 0, count = 0;
    int shortest = -1;
    for (int j = 1; j <= n; ++j) {
        prefix += a[j - 1];
        auto it = seen.find(prefix - k);
        if (it != seen.end()) {
            count += it->second;
            int len = j - lastPos[prefix - k];
            if (shortest == -1 || len < shortest) shortest = len;
        }
        ++seen[prefix];
        lastPos[prefix] = j;            // record AFTER using it, so a run has at least one element
    }
    std::cout << "count: " << count << '\n';
    if (shortest == -1) std::cout << "shortest: none\n";
    else std::cout << "shortest: " << shortest << '\n';
}
```

```hint
Start both maps with the **empty prefix**: sum `0`, seen once, at position `0`. Otherwise runs that
start at the very first element are missed.
```

```hint
At step `j`, first look up `prefix - k` (that's every run ending here), and only **then** record the
current prefix. Recording first would let `k = 0` match an empty run.
```

```hint
Sums reach `2 * 10^14` and the count can reach about `2 * 10^10` (think of 200 000 zeros with
`k = 0`), so use `long long` for both.
```

```stdin
5
1 2 3 -2 2
3
```

```expected
count: 4
shortest: 1
```

```stdin
3
1 1 1
5
```

```expected
count: 0
shortest: none
```

```stdin
4
0 0 0 0
0
```

```expected hidden
count: 10
shortest: 1
```

```stdin
6
3 4 -7 3 1 3
7
```

```expected hidden
count: 3
shortest: 2
```

```stdin
3
1000000000 1000000000 1000000000
2000000000
```

```expected hidden
count: 2
shortest: 2
```

```stdin
1
-5
-5
```

```expected hidden
count: 1
shortest: 1
```

```checks
must std::unordered_map :: Use a std::unordered_map for the prefix sums.
mustnot for\s*\([^;]*;[^;]*;[^)]*\)\s*\{?\s*for\s*\( :: Avoid the O(n²) double loop: one pass with prefix sums.
```
:::
