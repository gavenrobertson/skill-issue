---
title: deque, list & forward_list
summary: The other sequence containers: a double-ended queue, doubly and singly linked lists, their special operations like splice, and why vector is still usually the answer.
---

## Sequence containers

A **sequence container** keeps elements in the order you put them. You know `std::vector` and
`std::array`. The standard library has three more, each with a different internal structure and
therefore different strengths:

| Container | Header | Structure |
| --- | --- | --- |
| `std::deque<T>` | `<deque>` | a list of fixed-size blocks: fast at **both ends** |
| `std::list<T>` | `<list>` | a **doubly** linked list of nodes |
| `std::forward_list<T>` | `<forward_list>` | a **singly** linked list of nodes |

All of them share most of vector's interface (`size`, `empty`, `push_back`, `insert`, `erase`, iterators,
range-for), so switching containers is often a one-line change.

## `std::deque`: double-ended queue

"Deque" (pronounced "deck") stands for **d**ouble-**e**nded **que**ue. Like a vector it supports `[]`
in O(1), but it can *also* add and remove at the **front** in O(1). A vector's `insert(begin(), x)` is
O(n) because it shifts everything.

```cpp run
#include <deque>
#include <iostream>

void print(const std::deque<int>& d) {
    for (int x : d) std::cout << x << ' ';
    std::cout << "(size " << d.size() << ")\n";
}

int main() {
    std::deque<int> d{3, 4};
    d.push_front(2);
    d.push_front(1);
    d.push_back(5);
    print(d);

    d.pop_front();
    d.pop_back();
    print(d);

    std::cout << "front " << d.front() << ", back " << d.back() << ", d[1] = " << d[1] << '\n';
    d.emplace_front(0);       // emplace versions exist at both ends
    print(d);
}
```

```output
1 2 3 4 5 (size 5)
2 3 4 (size 3)
front 2, back 4, d[1] = 3
0 2 3 4 (size 4)
```

Inside, a deque keeps several fixed-size blocks plus an index of them. Growing at either end just adds a
block, so existing elements **never move** when you push at the ends. That means references and pointers
to elements stay valid after `push_front`/`push_back` (iterators, however, are still invalidated).
Inserting in the middle is O(n), like a vector.

The price: elements are **not contiguous** (no `data()`), indexing does a little extra arithmetic, and
iteration is somewhat slower than a vector's. Use a deque when you really need fast operations at both
ends, for example a queue or a sliding window.

## `std::list`: doubly linked list

Each element of a `std::list` lives in its own **node**, separately allocated on the heap, with a pointer
to the previous and next node:

```
  [prev|10|next] <-> [prev|20|next] <-> [prev|30|next]
```

Consequences:

- **Insert or erase anywhere is O(1)** once you have an iterator to the position: only a few pointers
  change, nothing shifts.
- **Iterators are stable**: inserting or erasing never invalidates iterators to *other* elements.
- **No random access**: there's no `[]` and no `it + n`. Getting to the 500th element means following 500
  links (O(n)). Its iterators are bidirectional.
- **Memory overhead**: two pointers per element plus a heap allocation each, and the nodes are scattered
  in memory, which is slow for the CPU cache.

```cpp run
#include <iostream>
#include <iterator>
#include <list>

void print(const std::list<int>& l) {
    for (int x : l) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::list<int> l{10, 20, 30};
    l.push_front(5);
    l.push_back(40);
    print(l);

    auto it = std::next(l.begin(), 2);     // points at 20
    l.insert(it, 15);                      // O(1): 15 goes before 20
    std::cout << "it still points at " << *it << '\n';   // stable!
    print(l);

    it = l.erase(it);                      // erase 20; returns iterator to 30
    std::cout << "now at " << *it << '\n';
    print(l);
}
```

```output
5 10 20 30 40
it still points at 20
5 10 15 20 30 40
now at 30
5 10 15 30 40
```

### List-specific member functions

Because generic algorithms like `std::sort` need random access, and others like `std::remove` would
pointlessly copy values around, `list` has its own **member** versions that just relink nodes:

| Member | Does |
| --- | --- |
| `l.sort()` / `l.sort(comp)` | sorts the list (stable, O(n log n)) |
| `l.unique()` | removes **adjacent** duplicates |
| `l.remove(value)` / `l.remove_if(pred)` | erases matching elements (no erase-remove needed) |
| `l.reverse()` | reverses the order |
| `l.merge(other)` | merges another **sorted** list into this sorted list; `other` becomes empty |
| `l.splice(pos, other, ...)` | **moves** nodes from `other` into this list before `pos` |

```cpp run
#include <iostream>
#include <list>
#include <string>

int main() {
    std::list<std::string> words{"pear", "apple", "fig", "apple", "kiwi", "fig"};

    words.sort();               // apple apple fig fig kiwi pear
    words.unique();             // apple fig kiwi pear
    words.remove("kiwi");       // apple fig pear
    words.reverse();            // pear fig apple

    for (const auto& w : words) std::cout << w << ' ';
    std::cout << '\n';

    std::list<int> a{1, 4, 9};
    std::list<int> b{2, 3, 10};
    a.merge(b);                 // both must be sorted
    for (int x : a) std::cout << x << ' ';
    std::cout << "| b has " << b.size() << " elements\n";
}
```

```output
pear fig apple
1 2 3 4 9 10 | b has 0 elements
```

### `splice`: moving nodes between lists

`splice` is the linked list's superpower. It transfers nodes from one list to another **without copying
or allocating anything**, in O(1) (for one element or a whole list). It comes in three forms:

```cpp run
#include <iostream>
#include <iterator>
#include <list>

void print(const char* name, const std::list<int>& l) {
    std::cout << name << ": ";
    for (int x : l) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::list<int> a{1, 2, 3};
    std::list<int> b{10, 20, 30, 40};

    // 1. a whole list: move all of b into a, before a's second element
    a.splice(std::next(a.begin()), b);
    print("a", a);
    print("b", b);

    // 2. one element: move the 20 to the front of c
    std::list<int> c{100};
    auto twenty = std::next(a.begin(), 2);
    c.splice(c.begin(), a, twenty);
    print("a", a);
    print("c", c);

    // 3. a range: move [first, last) of a to the end of c
    c.splice(c.end(), a, std::next(a.begin()), std::prev(a.end()));
    print("a", a);
    print("c", c);
}
```

```output
a: 1 10 20 30 40 2 3
b:
a: 1 10 30 40 2 3
c: 20 100
a: 1 3
c: 20 100 10 30 40 2
```

Iterators to spliced elements stay valid; they now simply point into the other list.

## `std::forward_list`: singly linked list

A `forward_list` stores only a **next** pointer per node, saving memory. It's deliberately minimal:

- iterators are **forward** only (no `--`, no `rbegin`),
- there's **no `size()`** (it would cost extra memory to track), use `std::distance(fl.begin(), fl.end())`
  if you must,
- there's no `push_back`, only `push_front`,
- since you can't go backwards, insertion and erasure happen **after** a position: `insert_after`,
  `erase_after`, `emplace_after`. To work at the very front there's a special `before_begin()` iterator.

```cpp run
#include <forward_list>
#include <iostream>

void print(const std::forward_list<int>& fl) {
    for (int x : fl) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::forward_list<int> fl{2, 3, 5};
    fl.push_front(1);                         // 1 2 3 5
    print(fl);

    auto it = fl.begin();                     // at 1
    ++it; ++it;                               // at 3
    fl.insert_after(it, 4);                   // 1 2 3 4 5
    print(fl);

    fl.erase_after(fl.begin());               // erases the element after 1 (the 2)
    fl.insert_after(fl.before_begin(), 0);    // insert at the very front
    print(fl);

    fl.remove_if([](int x) { return x % 2 == 1; });   // remove odd numbers
    print(fl);
}
```

```output
1 2 3 5
1 2 3 4 5
0 1 3 4 5
0 4
```

(`[](int x) { return x % 2 == 1; }` is a small lambda: "is `x` odd?". Lambdas get their own module later.)

`forward_list` also has `sort`, `unique`, `remove`, `reverse`, `merge` and `splice_after`. It's mainly
useful when you need a huge number of tiny lists and every byte counts.

## Which one should I use?

| Need | Use |
| --- | --- |
| A sequence, adding at the end, indexing, iterating (the common case) | **`std::vector`** |
| Fast push/pop at **both** ends, plus indexing | `std::deque` |
| Many insertions/removals in the middle **while holding iterators**, or splicing between lists | `std::list` |
| Like `list`, minimal memory, only forward traversal | `std::forward_list` |

The honest advice: **start with `std::vector`**. Linked lists win in theory for middle insertions, but
in practice finding the position is O(n) anyway, and a vector's contiguous memory is so cache friendly
that shifting a few thousand elements is often *faster* than chasing pointers. Switch only when you have a
specific need from the table, or when measurements show it helps.

## Common mistakes

- **`std::sort` on a list**: doesn't compile. Use `l.sort()`.
- **Indexing a list**: `l[2]` doesn't exist. Use `std::next(l.begin(), 2)` (O(n)).
- **`fl.size()` on a `forward_list`**: doesn't exist.
- **`unique()` without sorting first**: only *adjacent* duplicates are removed.
- **Expecting deque iterators to survive `push_front`**: references survive, iterators don't.

```cpp compile-error
#include <list>

int main() {
    std::list<int> l{1, 2, 3};
    int second = l[1];   // error: no match for 'operator[]'
}
```

:::quiz
Which container supports **both** O(1) `push_front` **and** O(1) `operator[]`?

- [ ] `std::vector`
- [x] `std::deque`
- [ ] `std::list`
- [ ] `std::forward_list`

Vector has no `push_front` (and `insert` at the front is O(n)); the lists have no `[]`.
:::

:::quiz
You hold an iterator `it` to an element of a `std::list`. Then you insert and erase **other** elements.
Is `it` still valid?

- [x] Yes, list iterators stay valid unless their own element is erased
- [ ] No, any modification invalidates all list iterators
- [ ] Only if the list didn't reallocate

List nodes never move. Only the erased element's iterators become invalid. That stability is one of the
few real reasons to choose a list.
:::

:::exercise Double-ended commands
Process commands on a `std::deque<int>` until the input ends:

- `push_front X` and `push_back X` add `X` at that end,
- `pop_front` and `pop_back` remove from that end (do nothing if the deque is empty).

**Input:** one command per line.
**Output:** the final contents from front to back, separated by single spaces, or `empty` if nothing is
left.

```cpp starter
#include <deque>
#include <iostream>
#include <string>

int main() {
    std::deque<int> d;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push_back") {
            int x;
            std::cin >> x;
            d.push_back(x);
        }
        // handle the other commands
    }
    for (int x : d) std::cout << x << ' ';
    std::cout << '\n';
}
```

```cpp solution
#include <deque>
#include <iostream>
#include <string>

int main() {
    std::deque<int> d;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push_back" || cmd == "push_front") {
            int x;
            std::cin >> x;
            if (cmd == "push_back") d.push_back(x);
            else d.push_front(x);
        } else if (cmd == "pop_front") {
            if (!d.empty()) d.pop_front();
        } else if (cmd == "pop_back") {
            if (!d.empty()) d.pop_back();
        }
    }
    if (d.empty()) {
        std::cout << "empty\n";
        return 0;
    }
    for (std::size_t i = 0; i < d.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << d[i];
    }
    std::cout << '\n';
}
```

```hint
Popping from an empty deque is undefined behavior, so check `d.empty()` before `pop_front()`/`pop_back()`.
```

```stdin
push_back 2
push_front 1
push_back 3
push_front 0
pop_back
```

```expected
0 1 2
```

```stdin
pop_front
push_front 5
pop_back
pop_back
```

```expected hidden
empty
```

```checks
must std::deque :: Use a std::deque.
must push_front\s*\( :: Use push_front.
must pop_front\s*\( :: Use pop_front.
```
:::

:::exercise Splice the lists
Read two lists of integers, `a` and `b`, and a number `k`. Move **all** elements of `b` into `a` so that
they come right after the first `k` elements of `a` (`0 <= k <= size of a`), using `splice` (no copying
element by element).

**Input:** `n` and `n` integers for `a`; `m` and `m` integers for `b`; then `k`.
**Output:** the contents of `a` separated by single spaces on the first line, then `b size: S` on the
second line.

```cpp starter
#include <iostream>
#include <iterator>
#include <list>

std::list<int> readList() {
    int n;
    std::cin >> n;
    std::list<int> l;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        l.push_back(x);
    }
    return l;
}

int main() {
    std::list<int> a = readList();
    std::list<int> b = readList();
    int k;
    std::cin >> k;
    for (int x : b) a.push_back(x);
    for (int x : a) std::cout << x << ' ';
    std::cout << '\n' << "b size: " << b.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <iterator>
#include <list>

std::list<int> readList() {
    int n;
    std::cin >> n;
    std::list<int> l;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        l.push_back(x);
    }
    return l;
}

int main() {
    std::list<int> a = readList();
    std::list<int> b = readList();
    int k;
    std::cin >> k;
    a.splice(std::next(a.begin(), k), b);
    bool first = true;
    for (int x : a) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << '\n' << "b size: " << b.size() << '\n';
}
```

```hint
`std::next(a.begin(), k)` is the position **before which** `b` should be inserted.
```

```hint
`a.splice(position, b);` moves every node of `b` into `a` and leaves `b` empty.
```

```stdin
4 1 2 3 4
2 8 9
2
```

```expected
1 2 8 9 3 4
b size: 0
```

```stdin
2 1 2
3 7 7 7
0
```

```expected hidden
7 7 7 1 2
b size: 0
```

```stdin
2 5 6
1 9
2
```

```expected hidden
5 6 9
b size: 0
```

```checks
must \.splice\s*\( :: Use splice.
```
:::

:::exercise Sorted unique words
Read words into a `std::list<std::string>` until the input ends. Use the list's own `sort()` and
`unique()` member functions to keep one copy of each word in alphabetical order.

**Input:** words separated by whitespace.
**Output:** the distinct words in alphabetical order, separated by single spaces, then `count: N` on a
second line.

```cpp starter
#include <iostream>
#include <list>
#include <string>

int main() {
    std::list<std::string> words;
    std::string w;
    while (std::cin >> w) words.push_back(w);
    for (const auto& word : words) std::cout << word << ' ';
    std::cout << '\n' << "count: " << words.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <list>
#include <string>

int main() {
    std::list<std::string> words;
    std::string w;
    while (std::cin >> w) words.push_back(w);
    words.sort();
    words.unique();
    bool first = true;
    for (const auto& word : words) {
        if (!first) std::cout << ' ';
        std::cout << word;
        first = false;
    }
    std::cout << '\n' << "count: " << words.size() << '\n';
}
```

```hint
`words.sort();` then `words.unique();`. Sorting first puts duplicates next to each other.
```

```stdin
the cat and the dog and the bird
```

```expected
and bird cat dog the
count: 5
```

```stdin
same same same
```

```expected hidden
same
count: 1
```

```checks
must std::list :: Use a std::list.
must \.sort\s*\(\s*\) :: Use the member function sort().
must \.unique\s*\( :: Use the member function unique().
mustnot std::sort :: std::sort doesn't work on lists; use the member function.
```
:::

:::exercise Forward list cleanup
Read `n` integers and add each one to a `std::forward_list<int>` with `push_front` (so they end up in
reverse order). Then remove every occurrence of a given value `x` using the list's `remove` member.

**Input:** `n`, then `n` integers, then `x`.
**Output:** the remaining elements from the front of the list, separated by single spaces, or `empty` if
none are left.

```cpp starter
#include <forward_list>
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    std::forward_list<int> fl;
    for (int i = 0; i < n; ++i) {
        int v;
        std::cin >> v;
        fl.push_front(v);
    }
    int x;
    std::cin >> x;
    for (int v : fl) std::cout << v << ' ';
    std::cout << '\n';
}
```

```cpp solution
#include <forward_list>
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    std::forward_list<int> fl;
    for (int i = 0; i < n; ++i) {
        int v;
        std::cin >> v;
        fl.push_front(v);
    }
    int x;
    std::cin >> x;
    fl.remove(x);
    if (fl.empty()) {
        std::cout << "empty\n";
        return 0;
    }
    bool first = true;
    for (int v : fl) {
        if (!first) std::cout << ' ';
        std::cout << v;
        first = false;
    }
    std::cout << '\n';
}
```

```hint
`fl.remove(x);` erases every element equal to `x`. `fl.empty()` tells you if anything is left (there's no `size()`).
```

```stdin
6
1 2 3 2 4 2
2
```

```expected
4 3 1
```

```stdin
3
7 7 7
7
```

```expected hidden
empty
```

```checks
must std::forward_list :: Use a std::forward_list.
must push_front\s*\( :: Add elements with push_front.
must \.remove\s*\( :: Use the member function remove.
```
:::
