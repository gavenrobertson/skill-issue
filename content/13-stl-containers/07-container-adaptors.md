---
title: stack, queue & priority_queue
summary: Container adaptors restrict a container to one access pattern: last-in-first-out, first-in-first-out, or always-the-largest. Classic uses include bracket matching, BFS and top-k.
---

## What's an adaptor?

`std::stack`, `std::queue` and `std::priority_queue` aren't containers of their own. They're **container
adaptors**: thin wrappers around an existing container (a `deque` or `vector` by default) that expose
only a few operations. Why have fewer operations? Because the restriction **states your intent**. A
`std::stack` can only be used as a stack, so the code is easier to read and harder to misuse.

| Adaptor | Header | Order | Default underlying container |
| --- | --- | --- | --- |
| `std::stack<T>` | `<stack>` | LIFO: last in, first out | `std::deque<T>` |
| `std::queue<T>` | `<queue>` | FIFO: first in, first out | `std::deque<T>` |
| `std::priority_queue<T>` | `<queue>` | largest first | `std::vector<T>` |

Adaptors have **no iterators**: you can't loop over them with range-for, only look at the accessible end.

```cpp compile-error
#include <stack>

int main() {
    std::stack<int> s;
    s.push(1);
    for (int x : s) {}   // error: no begin()/end() for std::stack
}
```

## `std::stack`: last in, first out

Think of a stack of plates: you add on top and take from the top.

| Member | Does |
| --- | --- |
| `push(x)` / `emplace(args...)` | add on top |
| `top()` | the top element (reference) |
| `pop()` | remove the top element (returns **nothing**) |
| `empty()`, `size()` | as usual |

```cpp run
#include <iostream>
#include <stack>
#include <string>

int main() {
    std::stack<std::string> history;
    history.push("home");
    history.push("search");
    history.push("results");

    std::cout << "current: " << history.top() << '\n';

    while (!history.empty()) {          // "back" button, again and again
        std::cout << "leaving " << history.top() << '\n';
        history.pop();
    }
    std::cout << "size " << history.size() << '\n';
}
```

```output
current: results
leaving results
leaving search
leaving home
size 0
```

`pop()` returns `void`, so getting a value is always two steps: read `top()`, then `pop()`. Calling `top()`
or `pop()` on an empty stack is **undefined behavior**; always check `empty()` first.

### Classic use: matching brackets

Is `{[()()]}` balanced? Push every opening bracket. For a closing bracket, the top of the stack must be the
matching opener; pop it. At the end the stack must be empty.

```cpp run
#include <iostream>
#include <stack>
#include <string>

bool balanced(const std::string& s) {
    std::stack<char> open;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            open.push(c);
        } else if (c == ')' || c == ']' || c == '}') {
            if (open.empty()) return false;
            char expected = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (open.top() != expected) return false;
            open.pop();
        }
    }
    return open.empty();
}

int main() {
    for (std::string s : {"{[()()]}", "([)]", "((", "a(b)c"}) {
        std::cout << s << " -> " << (balanced(s) ? "balanced" : "not balanced") << '\n';
    }
}
```

```output
{[()()]} -> balanced
([)] -> not balanced
(( -> not balanced
a(b)c -> balanced
```

Stacks also model function calls (the "call stack"), undo histories, and depth-first search.

## `std::queue`: first in, first out

A queue is a line at a shop: join at the **back**, leave from the **front**.

| Member | Does |
| --- | --- |
| `push(x)` / `emplace(args...)` | add at the back |
| `front()` | the next element to leave |
| `back()` | the most recently added element |
| `pop()` | remove the front element (returns nothing) |
| `empty()`, `size()` | as usual |

```cpp run
#include <iostream>
#include <queue>
#include <string>

int main() {
    std::queue<std::string> line;
    line.push("Ann");
    line.push("Ben");
    line.push("Cat");

    std::cout << "front " << line.front() << ", back " << line.back() << '\n';
    while (!line.empty()) {
        std::cout << "serving " << line.front() << '\n';
        line.pop();
    }
}
```

```output
front Ann, back Cat
serving Ann
serving Ben
serving Cat
```

### Classic use: breadth-first search

A queue processes things in the order they were discovered. On a grid or graph that gives
**breadth-first search** (BFS), which finds the shortest number of steps from a start point:

```cpp run
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::string> grid{
        "S.#.",
        ".##.",
        "...E",
    };
    int rows = static_cast<int>(grid.size());
    int cols = static_cast<int>(grid[0].size());
    std::vector<std::vector<int>> dist(rows, std::vector<int>(cols, -1));

    std::queue<std::pair<int, int>> q;
    q.push({0, 0});
    dist[0][0] = 0;
    const int dr[] = {1, -1, 0, 0};
    const int dc[] = {0, 0, 1, -1};

    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        for (int d = 0; d < 4; ++d) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (grid[nr][nc] == '#' || dist[nr][nc] != -1) continue;
            dist[nr][nc] = dist[r][c] + 1;
            q.push({nr, nc});
        }
    }
    std::cout << "steps to E: " << dist[2][3] << '\n';
}
```

```output
steps to E: 5
```

Because cells are taken out in the order they were reached, every cell at distance 1 is processed before any
at distance 2, and so on. That's what guarantees the shortest path.

## `std::priority_queue`: always the largest first

A priority queue gives you the **largest** element first, whatever order you inserted in. It's
implemented as a **binary heap** inside a vector: `push` and `pop` are O(log n), `top` is O(1).

| Member | Does |
| --- | --- |
| `push(x)` / `emplace(args...)` | insert, O(log n) |
| `top()` | the largest element (read-only), O(1) |
| `pop()` | remove the largest, O(log n) |
| `empty()`, `size()` | as usual |

```cpp run
#include <iostream>
#include <queue>

int main() {
    std::priority_queue<int> pq;
    for (int x : {5, 1, 8, 3, 9, 2}) pq.push(x);

    std::cout << "top: " << pq.top() << '\n';
    while (!pq.empty()) {
        std::cout << pq.top() << ' ';
        pq.pop();
    }
    std::cout << '\n';
}
```

```output
top: 9
9 8 5 3 2 1
```

Popping everything gives the elements in descending order. This is the idea behind **heap sort**.

### Min-heap with `std::greater`

To get the **smallest** first, change the comparator. The comparator is the **third** template argument,
so you must also spell out the second, the underlying container:

```cpp run
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    std::priority_queue<int, std::vector<int>, std::greater<int>> minHeap;
    for (int x : {5, 1, 8, 3, 9, 2}) minHeap.push(x);

    while (!minHeap.empty()) {
        std::cout << minHeap.top() << ' ';
        minHeap.pop();
    }
    std::cout << '\n';
}
```

```output
1 2 3 5 8 9
```

The comparator rule is backwards from intuition: the priority queue puts on top the element that is
"largest" according to the comparator. With `std::less` (the default), that's the largest; with
`std::greater`, the "largest" by `>` is the smallest number.

### Custom priorities

For your own types, either give them an `operator<`, or write a comparator that returns `true` when the
first argument has **lower** priority than the second (should come out *later*):

```cpp run
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct Task {
    int priority;
    std::string name;
};

struct LowerPriority {
    bool operator()(const Task& a, const Task& b) const {
        if (a.priority != b.priority) return a.priority < b.priority;   // higher priority on top
        return a.name > b.name;                                         // ties: alphabetical first
    }
};

int main() {
    std::priority_queue<Task, std::vector<Task>, LowerPriority> todo;
    todo.push({2, "write tests"});
    todo.push({5, "fix crash"});
    todo.push({2, "refactor"});
    todo.push({1, "update docs"});

    while (!todo.empty()) {
        const Task& t = todo.top();
        std::cout << t.priority << ' ' << t.name << '\n';
        todo.pop();
    }
}
```

```output
5 fix crash
2 refactor
2 write tests
1 update docs
```

`std::pair` already compares by `.first` then `.second`, so `std::priority_queue<std::pair<int, std::string>>`
also works for quick jobs (but ties come out in *reverse* alphabetical order, since bigger is first).

### Classic use: top-k

To find the `k` largest of many numbers, keep a **min-heap of size k**. Its top is the smallest of the
current top-k. For each new number, push it; if the heap grows beyond `k`, pop the smallest. This uses
O(k) memory and O(n log k) time, much better than sorting everything when `k` is small.

```cpp run
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    std::vector<int> data{7, 2, 9, 4, 11, 5, 3, 8};
    const std::size_t k = 3;

    std::priority_queue<int, std::vector<int>, std::greater<int>> best;
    for (int x : data) {
        best.push(x);
        if (best.size() > k) best.pop();     // drop the smallest
    }

    std::vector<int> result;
    while (!best.empty()) {
        result.push_back(best.top());
        best.pop();
    }
    for (auto it = result.rbegin(); it != result.rend(); ++it) std::cout << *it << ' ';
    std::cout << '\n';
}
```

```output
11 9 8
```

## Choosing the underlying container

The second template argument picks the container the adaptor wraps:

```cpp
std::stack<int, std::vector<int>> s1;     // stack on a vector
std::stack<int, std::list<int>> s2;       // stack on a list
std::queue<int, std::list<int>> q1;       // queue needs push_back and pop_front: deque or list
```

The defaults are good; you rarely need to change them.

## Common mistakes

- **Expecting `pop()` to return the value**: it returns `void`. Read `top()`/`front()` first.
- **`top()`/`front()`/`pop()` on an empty adaptor**: undefined behavior. Check `empty()`.
- **Trying to iterate**: adaptors have no iterators. If you need to see every element, you probably want
  the underlying container instead.
- **Forgetting the middle argument**: `std::priority_queue<int, std::greater<int>>` is an error;
  write `std::priority_queue<int, std::vector<int>, std::greater<int>>`.
- **Comparator direction**: for a priority queue, `comp(a, b) == true` means `a` comes out **after** `b`.

:::quiz
What does this print?

```cpp
std::stack<int> s;
s.push(1); s.push(2); s.push(3);
s.pop();
std::cout << s.top();
```

- [ ] `1`
- [x] `2`
- [ ] `3`

LIFO: `3` was pushed last, so `pop()` removes it, and `2` is on top.
:::

:::quiz
You push `4, 1, 7` into `std::priority_queue<int, std::vector<int>, std::greater<int>> pq;`. What is `pq.top()`?

- [x] `1`
- [ ] `4`
- [ ] `7`

With `std::greater`, the priority queue behaves as a min-heap: the smallest element is on top.
:::

:::exercise Balanced brackets {easy}
Check whether a string of brackets `()[]{}` is balanced, using a `std::stack<char>`. Every closing bracket
must match the most recent unmatched opening bracket, and nothing may be left open at the end.

**Input:** one string without spaces, made only of bracket characters.
**Output:** `balanced` or `not balanced`.

```cpp starter
#include <iostream>
#include <stack>
#include <string>

int main() {
    std::string s;
    std::cin >> s;
    int depth = 0;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') ++depth;
        else --depth;
    }
    std::cout << (depth == 0 ? "balanced" : "not balanced") << '\n';
}
```

```cpp solution
#include <iostream>
#include <stack>
#include <string>

int main() {
    std::string s;
    std::cin >> s;
    std::stack<char> open;
    bool ok = true;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            open.push(c);
        } else {
            char expected = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (open.empty() || open.top() != expected) {
                ok = false;
                break;
            }
            open.pop();
        }
    }
    if (!open.empty()) ok = false;
    std::cout << (ok ? "balanced" : "not balanced") << '\n';
}
```

```hint
Counting isn't enough: `([)]` has matching counts but isn't balanced. The stack remembers **which**
bracket is open.
```

```hint
On a closing bracket, fail if the stack is empty or its top isn't the matching opener; otherwise pop.
After the loop, the stack must be empty.
```

```stdin
{[()()]}
```

```expected
balanced
```

```stdin
([)]
```

```expected hidden
not balanced
```

```stdin
)(
```

```expected hidden
not balanced
```

```stdin
(((
```

```expected hidden
not balanced
```

```stdin
([]{})[]
```

```expected hidden
balanced
```

```stdin
]
```

```expected hidden
not balanced
```

```checks
must std::stack :: Use a std::stack.
```
:::

:::exercise Hot potato {medium}
`n` players stand in a circle, listed in order. Starting from the first player, the potato is passed
`k - 1` times (each pass moves the front player to the back of the line), and then the player holding it
(at the front) is eliminated. This repeats until one player remains. Simulate it with a
`std::queue<std::string>`.

**Input:** `n` and `k` (`k >= 1`), then `n` names.
**Output:** the eliminated players in order, one per line as `out: name`, then `winner: name`.

```cpp starter
#include <iostream>
#include <queue>
#include <string>

int main() {
    int n, k;
    std::cin >> n >> k;
    std::queue<std::string> players;
    for (int i = 0; i < n; ++i) {
        std::string name;
        std::cin >> name;
        players.push(name);
    }
    std::cout << "winner: " << players.front() << '\n';
}
```

```cpp solution
#include <iostream>
#include <queue>
#include <string>

int main() {
    int n, k;
    std::cin >> n >> k;
    std::queue<std::string> players;
    for (int i = 0; i < n; ++i) {
        std::string name;
        std::cin >> name;
        players.push(name);
    }
    while (players.size() > 1) {
        for (int pass = 0; pass < k - 1; ++pass) {
            players.push(players.front());
            players.pop();
        }
        std::cout << "out: " << players.front() << '\n';
        players.pop();
    }
    std::cout << "winner: " << players.front() << '\n';
}
```

```hint
One pass = `players.push(players.front()); players.pop();` (the front player moves to the back).
```

```stdin
5 3
Ann Ben Cat Dan Eve
```

```expected
out: Cat
out: Ann
out: Eve
out: Ben
winner: Dan
```

```stdin
3 1
X Y Z
```

```expected hidden
out: X
out: Y
winner: Z
```

```stdin
1 4
Solo
```

```expected hidden
winner: Solo
```

```stdin
2 5
A B
```

```expected hidden
out: A
winner: B
```

```checks
must std::queue :: Use a std::queue.
```
:::

:::exercise Top k largest {medium}
Print the `k` largest numbers of the input in descending order, using a **min-heap** of size at most `k`
(`std::priority_queue` with `std::greater<int>`).

**Input:** `k` and `n`, then `n` integers (`k >= 1`).
**Output:** the `min(k, n)` largest values from largest to smallest, separated by single spaces. If `n`
is 0, print an empty line.

```cpp starter
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    int k, n;
    std::cin >> k >> n;
    std::priority_queue<int> pq;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        pq.push(x);
    }
    while (!pq.empty()) {
        std::cout << pq.top() << ' ';
        pq.pop();
    }
    std::cout << '\n';
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    int k, n;
    std::cin >> k >> n;
    std::priority_queue<int, std::vector<int>, std::greater<int>> best;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        best.push(x);
        if (static_cast<int>(best.size()) > k) best.pop();
    }
    std::vector<int> result;
    while (!best.empty()) {
        result.push_back(best.top());
        best.pop();
    }
    for (auto it = result.rbegin(); it != result.rend(); ++it) {
        if (it != result.rbegin()) std::cout << ' ';
        std::cout << *it;
    }
    std::cout << '\n';
}
```

```hint
`std::priority_queue<int, std::vector<int>, std::greater<int>> best;` keeps the smallest on top. After
each push, pop if the size exceeds `k`.
```

```hint
Popping the min-heap gives the answer in **ascending** order. Store it in a vector and print it backwards.
```

```stdin
3 8
7 2 9 4 11 5 3 8
```

```expected
11 9 8
```

```stdin
5 3
-1 -3 -2
```

```expected hidden
-1 -2 -3
```

```stdin
2 4
6 6 6 1
```

```expected hidden
6 6
```

```stdin
1 5
-5 -1 -9 -1 -3
```

```expected hidden
-1
```

```stdin
3 0
```

```expected hidden
```

```checks
must std::priority_queue :: Use a std::priority_queue.
must std::greater :: Make it a min-heap with std::greater.
```
:::

:::exercise Task scheduler {medium}
Read tasks with priorities and print them in the order they should run: **higher priority first**, and
for equal priorities, **alphabetical** by name. Use a `std::priority_queue` with a custom comparator.

**Input:** `n`, then `n` lines `priority name`.
**Output:** one line per task, `priority name`, in run order.

```cpp starter
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct Task {
    int priority;
    std::string name;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Task> tasks;
    for (int i = 0; i < n; ++i) {
        Task t;
        std::cin >> t.priority >> t.name;
        tasks.push_back(t);
    }
    for (const Task& t : tasks) std::cout << t.priority << ' ' << t.name << '\n';
}
```

```cpp solution
#include <iostream>
#include <queue>
#include <string>
#include <vector>

struct Task {
    int priority;
    std::string name;
};

struct RunsLater {
    bool operator()(const Task& a, const Task& b) const {
        if (a.priority != b.priority) return a.priority < b.priority;
        return a.name > b.name;
    }
};

int main() {
    int n;
    std::cin >> n;
    std::priority_queue<Task, std::vector<Task>, RunsLater> pq;
    for (int i = 0; i < n; ++i) {
        Task t;
        std::cin >> t.priority >> t.name;
        pq.push(t);
    }
    while (!pq.empty()) {
        std::cout << pq.top().priority << ' ' << pq.top().name << '\n';
        pq.pop();
    }
}
```

```hint
The comparator returns `true` when `a` should run **after** `b`: lower priority, or same priority and a
name that is alphabetically later.
```

```stdin
4
2 write
5 fix
2 debug
1 docs
```

```expected
5 fix
2 debug
2 write
1 docs
```

```stdin
3
0 c
0 a
0 b
```

```expected hidden
0 a
0 b
0 c
```

```stdin
4
-1 a
3 z
-1 A
3 b
```

```expected hidden
3 b
3 z
-1 A
-1 a
```

```checks
must std::priority_queue :: Use a std::priority_queue.
must operator\s*\(\s*\)|\[\s*\]\s*\( :: Write a custom comparator.
```
:::

:::exercise Running median {hard}
Numbers arrive one at a time. After each one, print the **median** of all numbers seen so far: the
middle value in sorted order. When the count is even there are two middle values; print the
**smaller** one.

Re-sorting after every number is O(n² log n). The classic solution uses **two heaps**:

- `low`: a max-heap (`std::priority_queue<int>`) holding the smaller half,
- `high`: a min-heap (`std::priority_queue<int, std::vector<int>, std::greater<int>>`) holding the
  larger half.

Keep every element of `low` `<=` every element of `high`, and keep their sizes balanced so that `low`
has the same number of elements as `high`, or one more. Then the answer is always `low.top()`.

**Input:** `n`, then `n` integers.
**Output:** the `n` medians, one per line.

Example: for `5 2 8 1` the medians are `5` (of 5), `2` (of 2 5), `5` (of 2 5 8), `2` (of 1 2 5 8).

```cpp starter
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        std::cout << x << '\n';
    }
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::priority_queue<int> low;                                       // max-heap: smaller half
    std::priority_queue<int, std::vector<int>, std::greater<int>> high; // min-heap: larger half

    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        if (low.empty() || x <= low.top()) low.push(x);
        else high.push(x);

        // rebalance: low may have at most one element more than high
        if (low.size() > high.size() + 1) {
            high.push(low.top());
            low.pop();
        } else if (high.size() > low.size()) {
            low.push(high.top());
            high.pop();
        }
        std::cout << low.top() << '\n';
    }
}
```

```hint
Insert first: if `x <= low.top()` (or `low` is empty) it belongs in `low`, otherwise in `high`. Then
rebalance by moving **one** top element from the bigger heap to the other.
```

```hint
The sizes rule "`low` has the same size as `high`, or one more" makes `low.top()` the median for odd
counts and the lower middle value for even counts.
```

```stdin
4
5 2 8 1
```

```expected
5
2
5
2
```

```stdin
1
-7
```

```expected
-7
```

```stdin
6
1 2 3 4 5 6
```

```expected hidden
1
1
2
2
3
3
```

```stdin
6
6 5 4 3 2 1
```

```expected hidden
6
5
5
4
4
3
```

```stdin
7
3 3 3 -1 -1 10 3
```

```expected hidden
3
3
3
3
3
3
3
```

```stdin
5
-10 20 -30 40 0
```

```expected hidden
-10
-10
-10
-10
0
```

```checks
must std::priority_queue :: Use std::priority_queue.
must std::greater :: Use a min-heap (std::greater) for the larger half.
mustnot std::sort|nth_element|std::multiset :: Use the two heaps instead of sorting.
```
:::
