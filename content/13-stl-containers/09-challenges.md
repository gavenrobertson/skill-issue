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
