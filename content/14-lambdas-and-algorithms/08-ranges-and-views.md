---
title: Ranges & Views
summary: C++20 ranges. Algorithms that take whole containers, projections, and lazy views (filter, transform, take, drop, reverse, iota, keys, values) composed with the pipe operator.
---

## Ranges algorithms: pass the container

Writing `v.begin(), v.end()` every time is noisy, and passing iterators from two different
containers by accident is a real bug. C++20 added versions of the algorithms in the namespace
**`std::ranges`** that take a **range** (anything with `begin()` and `end()`: a container, an array,
a view) directly. They live in the same headers (`<algorithm>`, and `<numeric>` for `iota`):

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{5, 3, 8, 1, 9, 2};

    std::ranges::sort(v);                                         // instead of std::sort(v.begin(), v.end())
    std::cout << v.front() << ' ' << v.back() << '\n';

    std::ranges::sort(v, std::ranges::greater{});                 // comparator still works
    std::cout << v.front() << '\n';

    auto it = std::ranges::find(v, 8);
    std::cout << "8 at index " << (it - v.begin()) << '\n';

    std::cout << std::ranges::count_if(v, [](int x) { return x > 4; }) << " above 4\n";
    std::cout << std::boolalpha << std::ranges::all_of(v, [](int x) { return x > 0; }) << '\n';

    std::cout << std::ranges::max(v) << ' ' << std::ranges::min(v) << '\n';   // values, not iterators

    std::ranges::reverse(v);
    std::cout << std::ranges::is_sorted(v) << '\n';
}
```

```output
1 9
9
8 at index 1
3 above 4
true
9 1
true
```

Nearly every algorithm from the previous lessons has a `std::ranges::` twin: `sort`, `stable_sort`,
`find`, `find_if`, `count`, `count_if`, `copy`, `copy_if`, `transform`, `fill`, `reverse`,
`unique`, `min_element`, `max_element`, `binary_search`, `lower_bound`, `equal`, and so on.
(The `<numeric>` folds like `accumulate` don't have ranges versions in C++20; C++23 adds
`std::ranges::fold_left`.) They still accept iterator pairs too: `std::ranges::sort(v.begin(), v.end())`.

### Better error messages

The ranges algorithms are constrained with **concepts**, so misuse fails early with a message about
the requirement that isn't met, instead of an error deep inside the library:

```cpp compile-error
#include <algorithm>
#include <list>

int main() {
    std::list<int> l{3, 1, 2};
    std::ranges::sort(l);   // error: no match for call... note: the constraint 'random_access_range' was not satisfied
}
```

### Protection against dangling iterators

If you call a ranges algorithm on a **temporary** container, the returned iterator would point into
a destroyed object. Instead of letting that compile, the algorithm returns `std::ranges::dangling`,
which can't be dereferenced:

```cpp compile-error
#include <algorithm>
#include <vector>

std::vector<int> make() { return {3, 1, 2}; }

int main() {
    auto it = std::ranges::find(make(), 2);   // the vector is destroyed at the end of this line
    return *it;                                // error: no match for 'operator*' (operand type is 'std::ranges::dangling')
}
```

## Projections

Most ranges algorithms take an optional **projection**: a function applied to each element
**before** it's compared or tested. It lets you say "sort people **by age**" without writing a
comparator that repeats `.age` twice. The projection comes **after** the comparator; pass `{}` to
keep the default comparator (`std::ranges::less`):

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Person {
    std::string name;
    int age;
};

int main() {
    std::vector<Person> people{{"Ana", 31}, {"Ben", 25}, {"Cy", 40}, {"Di", 28}};

    std::ranges::sort(people, {}, &Person::age);                        // by age, ascending
    for (const auto& p : people) std::cout << p.name << ' ';
    std::cout << '\n';

    std::ranges::sort(people, std::ranges::greater{}, &Person::name);   // by name, descending
    for (const auto& p : people) std::cout << p.name << ' ';
    std::cout << '\n';

    // A projection can be any callable, e.g. a lambda: sort by name length
    std::ranges::stable_sort(people, {}, [](const Person& p) { return p.name.size(); });
    std::cout << people.front().name << '\n';

    auto oldest = std::ranges::max_element(people, {}, &Person::age);
    std::cout << "oldest: " << oldest->name << '\n';

    auto ben = std::ranges::find(people, "Ben", &Person::name);   // compare names to "Ben"
    std::cout << "Ben is " << ben->age << '\n';
}
```

```output
Ben Di Ana Cy 
Di Cy Ben Ana 
Di
oldest: Cy
Ben is 25
```

A **pointer to a data member** (`&Person::age`) works as a projection, because ranges algorithms
call it through `std::invoke`.

## Views: lazy ranges

A **view** is a lightweight range that **doesn't own** its elements. It describes a *way of looking
at* another range: "only the even ones", "each one doubled", "the first five". Views live in
**`<ranges>`**, in the namespace `std::views` (short for `std::ranges::views`).

```cpp run
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6, 7, 8};

    // The pipe | feeds the range on the left into the view adaptor on the right
    auto even_squares = v | std::views::filter([](int x) { return x % 2 == 0; })
                          | std::views::transform([](int x) { return x * x; });

    for (int x : even_squares) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
4 16 36 64 
```

Read the pipeline left to right: start with `v`, keep the even numbers, square them. **Nothing was
copied** and no new vector was created. `even_squares` just remembers `v`, the filter, and the
transform, and computes each element when the loop asks for it.

The pipe is just nicer syntax for nested calls. These are equivalent:

```cpp
auto a = v | std::views::filter(pred) | std::views::transform(f);
auto b = std::views::transform(std::views::filter(v, pred), f);
```

### The common views

| View | Produces |
| --- | --- |
| `std::views::filter(pred)` | only the elements for which `pred` is true |
| `std::views::transform(f)` | `f(element)` for each element |
| `std::views::take(n)` | the first `n` elements (fewer if the range is shorter) |
| `std::views::drop(n)` | everything **except** the first `n` |
| `std::views::take_while(pred)` | elements from the start while `pred` is true |
| `std::views::drop_while(pred)` | skips elements from the start while `pred` is true |
| `std::views::reverse` | the elements back to front (note: no parentheses) |
| `std::views::iota(a, b)` | the numbers `a, a+1, ..., b-1` (generated, no container) |
| `std::views::iota(a)` | `a, a+1, a+2, ...` **forever** |
| `std::views::keys` / `std::views::values` | the first / second member of each pair (e.g. in a map) |

```cpp run
#include <iostream>
#include <map>
#include <ranges>
#include <string>
#include <vector>

void print(auto&& range) {
    for (const auto& x : range) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6, 7, 8, 9};

    print(v | std::views::take(3));
    print(v | std::views::drop(6));
    print(v | std::views::reverse);
    print(v | std::views::drop(2) | std::views::take(4) | std::views::reverse);
    print(v | std::views::take_while([](int x) { return x < 4; }));
    print(v | std::views::drop_while([](int x) { return x < 7; }));

    print(std::views::iota(1, 6));                          // 1..5
    print(std::views::iota(10) | std::views::take(3));      // infinite, but we only take 3

    std::map<std::string, int> stock{{"apple", 3}, {"kiwi", 0}, {"pear", 7}};
    print(stock | std::views::keys);
    print(stock | std::views::values);
}
```

```output
1 2 3 
7 8 9 
9 8 7 6 5 4 3 2 1 
6 5 4 3 
1 2 3 
7 8 9 
1 2 3 4 5 
10 11 12 
apple kiwi pear 
3 0 7 
```

The helper takes `auto&&` instead of `const auto&` for a reason explained below.

### Laziness

Views do **no work** until you iterate, and then only as much as you consume. You can watch it
happen:

```cpp run
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6};

    auto doubled = v | std::views::transform([](int x) {
        std::cout << "(computing " << x << ") ";
        return x * 2;
    });
    std::cout << "view created, nothing computed yet\n";

    for (int x : doubled | std::views::take(2)) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
view created, nothing computed yet
(computing 1) 2 (computing 2) 4 
```

Only two elements were ever computed. That laziness is also why an infinite `iota` works: `take`
stops asking after `n` elements. Views also see the **current** contents of the underlying range
each time you iterate.

### Storing and reusing pipelines

Adaptors can be combined into a reusable pipeline *before* you have any data:

```cpp run
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    auto odd_cubes = std::views::filter([](int x) { return x % 2 != 0; })
                   | std::views::transform([](int x) { return x * x * x; });

    std::vector<int> a{1, 2, 3};
    std::vector<int> b{4, 5};
    for (int x : a | odd_cubes) std::cout << x << ' ';
    for (int x : b | odd_cubes) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
1 27 125 
```

## Getting a container back

A view isn't a container. To store the results, copy them into one. In C++20 that's
`std::ranges::copy` with a `back_inserter`:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v{7, 2, 9, 4};
    auto big = v | std::views::filter([](int x) { return x > 3; });

    std::vector<int> result;
    std::ranges::copy(big, std::back_inserter(result));
    std::ranges::sort(result);

    for (int x : result) std::cout << x << ' ';
    std::cout << "(size " << result.size() << ")\n";
}
```

```output
4 7 9 (size 3)
```

**C++23** adds `std::ranges::to`, which does this in one step:
`auto result = v | std::views::filter(...) | std::ranges::to<std::vector>();`. It's not available in
C++20, so this course doesn't use it.

## View pitfalls

- **A view doesn't own data.** If the underlying container is destroyed, the view dangles.
  Never return a view of a local vector from a function.
- **Some views can't be iterated through `const`.** `filter` (and a few others) remember where the
  first match was the first time you iterate, so iterating changes the view. A function taking
  `const auto&` then can't loop over it. Take views by value or by `auto&&`:

```cpp compile-error
#include <iostream>
#include <ranges>
#include <vector>

void print(const auto& r) {
    for (int x : r) std::cout << x << ' ';   // error: passing 'const filter_view<...>' discards qualifiers
}

int main() {
    std::vector<int> v{1, 2, 3, 4};
    print(v | std::views::filter([](int x) { return x % 2 == 0; }));
}
```

- **Lambdas in views should have no side effects** (other than demonstrations like the one above).
  An element may be computed more than once, for example when `filter` is stacked on top of
  `transform`.
- **Not every view supports every operation.** `reverse` needs a range it can walk backwards, and
  `.size()` exists only when the size can be known without iterating (a filtered view has no
  `.size()`).

:::quiz
What does this print?

```cpp
std::vector<int> v{1, 2, 3, 4, 5, 6};
for (int x : v | std::views::drop(1) | std::views::filter([](int x) { return x % 2 == 1; })
               | std::views::take(1))
    std::cout << x;
```

- [ ] `1`
- [x] `3`
- [ ] `35`
- [ ] `2`

`drop(1)` gives `2 3 4 5 6`, the filter keeps the odd ones `3 5`, and `take(1)` stops after `3`.
:::

:::quiz
`people` is a `std::vector<Person>` with a member `int age`. Which calls sort by age, ascending? (select all that apply)

- [x] `std::ranges::sort(people, {}, &Person::age);`
- [x] `std::ranges::sort(people, [](const Person& a, const Person& b) { return a.age < b.age; });`
- [ ] `std::ranges::sort(people, &Person::age);`
- [x] `std::sort(people.begin(), people.end(), [](const Person& a, const Person& b) { return a.age < b.age; });`

The projection is the **third** argument; the second is the comparator (`{}` means the default `std::ranges::less`). Passing `&Person::age` as the comparator doesn't compile.
:::

:::exercise Sort by age
Read `n` people (a name and an age each) and print them sorted by age, youngest first. People with
the same age stay in their **input order**. Use `std::ranges::stable_sort` with a **projection**.

**Input:** `n`, then `n` lines `name age`.
**Output:** one line per person: `name age`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Person {
    std::string name;
    int age;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Person> people(n);
    for (auto& p : people) std::cin >> p.name >> p.age;

    // sort here

    for (const auto& p : people) std::cout << p.name << ' ' << p.age << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Person {
    std::string name;
    int age;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Person> people(n);
    for (auto& p : people) std::cin >> p.name >> p.age;

    std::ranges::stable_sort(people, {}, &Person::age);

    for (const auto& p : people) std::cout << p.name << ' ' << p.age << '\n';
}
```

```hint
`std::ranges::stable_sort(people, {}, &Person::age);`: `{}` is the default comparator, and
`&Person::age` is the projection.
```

```stdin
4
zed 30
amy 25
bob 30
cat 19
```

```expected
cat 19
amy 25
zed 30
bob 30
```

```stdin
3
x 5
y 5
z 5
```

```expected hidden
x 5
y 5
z 5
```

```checks
must std::ranges::stable_sort :: Use std::ranges::stable_sort.
must &\s*Person\s*::\s*age|\[[^\]]*\]\s*\(\s*const\s+Person\s*&\s*\w+\s*\)\s*\{\s*return\s+\w+\.age :: Pass a projection such as &Person::age.
```
:::

:::exercise Even squares
Read `n` integers and print the squares of the **even** ones, in order, using a view pipeline:
`std::views::filter` piped into `std::views::transform`. If there are no even numbers, print `none`.

**Input:** `n`, then `n` integers.
**Output:** the squares separated by spaces, or `none`, followed by a newline.

```cpp starter
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    bool first = true;
    for (int x : v) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << (first ? "none" : "") << '\n';
}
```

```cpp solution
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto squares = v | std::views::filter([](int x) { return x % 2 == 0; })
                     | std::views::transform([](int x) { return x * x; });

    bool first = true;
    for (int x : squares) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << (first ? "none" : "") << '\n';
}
```

```hint
`auto squares = v | std::views::filter(...) | std::views::transform(...);` then loop over `squares`
instead of `v`.
```

```stdin
6
1 2 3 4 -6 7
```

```expected
4 16 36
```

```stdin
3
1 3 5
```

```expected
none
```

```stdin
1
0
```

```expected hidden
0
```

```checks
must views::filter :: Use std::views::filter.
must views::transform :: Use std::views::transform.
must \| :: Compose the views with the pipe operator |.
```
:::

:::exercise Window, reversed
Read `n` integers, then two numbers `a` and `b`. Skip the first `a` numbers, take the next `b`,
and print them in **reverse** order. Build it as one pipeline with `std::views::drop`,
`std::views::take` and `std::views::reverse`. If the result is empty, print `empty`.

**Input:** `n`, `n` integers, then `a b` (both `>= 0`).
**Output:** the selected numbers in reverse order separated by spaces, or `empty`.

```cpp starter
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int a, b;
    std::cin >> a >> b;

    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int a, b;
    std::cin >> a >> b;

    auto window = v | std::views::drop(a) | std::views::take(b) | std::views::reverse;

    if (window.empty()) {
        std::cout << "empty\n";
        return 0;
    }
    bool first = true;
    for (int x : window) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << '\n';
}
```

```hint
`auto window = v | std::views::drop(a) | std::views::take(b) | std::views::reverse;`
```

```hint
`drop` and `take` never go out of bounds: dropping more elements than exist just gives an empty
range. A view over a vector like this one has `.empty()`.
```

```stdin
7
10 20 30 40 50 60 70
2 3
```

```expected
50 40 30
```

```stdin
3
1 2 3
1 10
```

```expected
3 2
```

```stdin
3
1 2 3
5 2
```

```expected hidden
empty
```

```checks
must views::drop :: Use std::views::drop.
must views::take :: Use std::views::take.
must views::reverse :: Use std::views::reverse.
```
:::

:::exercise Repeated words
Read words until the end of input and count how often each appears in a `std::map<std::string, int>`.
Then print, in alphabetical order, the words that appear **more than once**, using
`std::views::filter` on the map followed by `std::views::keys`. If no word repeats, print `none`.

**Input:** any number of words separated by whitespace.
**Output:** the repeated words separated by spaces on one line, or `none`.

```cpp starter
#include <iostream>
#include <map>
#include <ranges>
#include <string>

int main() {
    std::map<std::string, int> counts;
    std::string w;
    while (std::cin >> w) ++counts[w];

    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>
#include <map>
#include <ranges>
#include <string>

int main() {
    std::map<std::string, int> counts;
    std::string w;
    while (std::cin >> w) ++counts[w];

    auto repeated = counts
                  | std::views::filter([](const auto& kv) { return kv.second > 1; })
                  | std::views::keys;

    bool first = true;
    for (const auto& word : repeated) {
        if (!first) std::cout << ' ';
        std::cout << word;
        first = false;
    }
    if (first) std::cout << "none";
    std::cout << '\n';
}
```

```hint
Each element of the map is a `std::pair<const std::string, int>`. The filter's lambda can take
`const auto& kv` and test `kv.second > 1`.
```

```hint
Then pipe into `std::views::keys` to keep only the words.
```

```stdin
the cat saw the dog and the cat ran
```

```expected
cat the
```

```stdin
every word is different
```

```expected
none
```

```stdin
b a b a c
```

```expected hidden
a b
```

```checks
must views::keys :: Use std::views::keys.
must views::filter :: Use std::views::filter.
```
:::
