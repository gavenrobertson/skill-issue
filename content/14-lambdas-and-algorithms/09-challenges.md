---
title: "Lambdas, Algorithms & Ranges: Challenges"
summary: Hard, real-world style problems solved with lambdas and the standard algorithms - multi-key sorting, interval merging, group-by reports, a lambda-driven calculator and a ranges pipeline.
---

These problems are meant to be **hard**. Each one is a small real program: a report, a calculator, a
data pipeline. The goal is to solve them the way an experienced C++ programmer would, by combining
standard algorithms with small lambdas instead of writing every loop by hand. You get a precise
specification, an example and a bare skeleton. Hidden tests check ties, empty input and other corners,
so read each specification carefully.

Try each problem on your own before opening the hints. When you're stuck, name the step you need
("sort by two keys", "keep the elements that...", "add up...") and look for the algorithm that does
exactly that.

## Warm-up: predict the output

:::quiz
What does this print?

```cpp
int x = 1;
auto a = [x]() mutable { return ++x; };
auto b = [&x] { return x * 10; };
auto c = a;
a();
a();
x = 5;
std::cout << a() << ' ' << c() << ' ' << b();
```

- [ ] `6 6 50`
- [ ] `4 4 50`
- [x] `4 2 50`
- [ ] `4 2 10`

`a` owns a **copy** of `x` (value `1`), and `mutable` lets each call increment it: `2`, `3`, then `4`.
`c` is a copy of the closure made **before** those calls, with its own counter still at `1`, so `c()`
returns `2`. `b` refers to the real `x`, which is `5` when it runs: `50`.
:::

:::quiz
What does this print?

```cpp
std::vector<int> v{1, 2, 3, 4, 5, 6};
int calls = 0;
auto r = v | std::views::filter([&calls](int y) { ++calls; return y % 2 == 0; })
           | std::views::take(2);
for (int y : r) std::cout << y;
std::cout << ' ' << calls;
```

- [ ] `24 4`
- [x] `24 6`
- [ ] `246 6`
- [ ] `24 2`

The view is lazy, but not as lazy as you might think. Finding `2` tests `1, 2`; moving to `4` tests
`3, 4`. Then the range-for loop increments the iterator **once more** before it compares with the end:
that step makes the filter look for the next even number, testing `5, 6`. Only then does `take` notice
it has produced 2 elements. That's 6 calls, and it's why predicates in views should have no side effects.
:::

## Problems
