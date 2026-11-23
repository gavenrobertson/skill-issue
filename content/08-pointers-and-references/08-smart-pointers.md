---
title: Smart Pointers
summary: RAII, std::unique_ptr for single ownership, std::shared_ptr for shared ownership, std::weak_ptr for breaking cycles, and how to choose between them.
---

The previous lesson ended with a problem: raw `new`/`delete` requires you to remember exactly one
matching `delete` on every path through your code. **Smart pointers** make that automatic. They're
objects that hold a pointer and **delete it for you** when the time is right. They live in `<memory>`.

## The idea behind them: RAII

C++ guarantees that when a local object goes out of scope, a special function called its
**destructor** runs, no matter how the scope is left: falling off the end, `return`, `break`, or an
exception. (You'll write your own destructors in the classes module. For now, just know they exist.)

**RAII** ("Resource Acquisition Is Initialization", a famously bad name for a great idea) uses this:

1. Acquire a resource (memory, a file, a lock) in an object's constructor.
2. Release it in that object's destructor.

Then cleanup can't be forgotten, because the language does it. `std::vector` and `std::string` are
RAII types for their heap buffers; smart pointers are RAII types for a single heap object. Here's a
small struct that announces when it's created and destroyed, so you can watch RAII happen:

```cpp run
#include <iostream>
#include <memory>

struct Noisy {
    int id;
    Noisy(int i) : id{i} { std::cout << "create " << id << '\n'; }   // constructor
    ~Noisy() { std::cout << "destroy " << id << '\n'; }               // destructor
};

int main() {
    std::cout << "start\n";
    {
        auto p = std::make_unique<Noisy>(1);
        std::cout << "using " << p->id << '\n';
    }   // p goes out of scope: its destructor deletes the Noisy automatically
    std::cout << "end\n";
}
```

```output
start
create 1
using 1
destroy 1
end
```

No `delete` anywhere, and no leak. (The `p->id` syntax means "member `id` of the object `p` points
to"; you'll see `->` properly in the structs lesson.)

## `std::unique_ptr`: one owner

A `std::unique_ptr<T>` **owns** a heap object exclusively. When the `unique_ptr` is destroyed, it deletes
the object. It's as fast and as small as a raw pointer, so it should be your default.

### Creating one

```cpp run
#include <iostream>
#include <memory>

int main() {
    auto a = std::make_unique<int>(42);        // preferred (C++14): no 'new' in sight
    std::unique_ptr<int> b = std::make_unique<int>();   // value-initialized: 0
    std::unique_ptr<int> c{new int{7}};        // also legal, but prefer make_unique
    std::unique_ptr<int> empty;                // holds nullptr

    std::cout << *a << ' ' << *b << ' ' << *c << '\n';

    *a += 1;                                   // use it like a pointer
    std::cout << *a << '\n';

    if (!empty) std::cout << "empty owns nothing\n";   // converts to bool like a pointer
    if (a) std::cout << "a owns something\n";
}
```

```output
42 0 7
43
empty owns nothing
a owns something
```

`std::make_unique<T>(args...)` forwards its arguments to `T`'s constructor and returns a
`std::unique_ptr<T>`. Prefer it over `new`: shorter, no type written twice, and no raw `new` to audit.

### It can't be copied, only moved

"Unique" means exactly one owner. Copying would create two owners that both try to delete the object,
so it's forbidden at compile time:

```cpp compile-error
#include <memory>

int main() {
    auto a = std::make_unique<int>(5);
    auto b = a;   // error: use of deleted function (unique_ptr's copy constructor)
}
```

To hand ownership to another `unique_ptr`, **move** it with `std::move` (from `<utility>`). The source
becomes empty (`nullptr`), guaranteed:

```cpp run
#include <iostream>
#include <memory>
#include <utility>

int main() {
    auto a = std::make_unique<int>(5);
    std::unique_ptr<int> b = std::move(a);    // ownership moves from a to b

    std::cout << (a ? "a owns it" : "a is empty") << '\n';
    std::cout << (b ? "b owns it" : "b is empty") << '\n';
    std::cout << *b << '\n';
}
```

```output
a is empty
b owns it
5
```

### unique_ptr and functions

How you pass a `unique_ptr` says what happens to ownership:

```cpp run
#include <iostream>
#include <memory>
#include <utility>

// Factory: creates an object and gives ownership to the caller.
std::unique_ptr<int> makeValue(int v) {
    return std::make_unique<int>(v);      // no std::move needed when returning
}

// Just looks at the object: take a reference (or a raw pointer). No ownership involved.
void show(const int& value) {
    std::cout << "value: " << value << '\n';
}

// Takes ownership ("sink"): by value. The caller must std::move into it.
void consume(std::unique_ptr<int> p) {
    std::cout << "consuming " << *p << '\n';
}   // p is destroyed here, deleting the int

int main() {
    std::unique_ptr<int> p = makeValue(10);
    show(*p);                  // borrow: p still owns it
    consume(std::move(p));     // give it away
    std::cout << (p ? "still owned" : "gone") << '\n';
}
```

```output
value: 10
consuming 10
gone
```

Guideline: functions that only **use** an object should take `T&`, `const T&`, or `T*`, not a smart
pointer. Pass a smart pointer only when the function deals with **ownership**.

### `.get()`, `.reset()`, and `.release()`

```cpp run
#include <iostream>
#include <memory>

void legacyPrint(const int* p) {           // an old function that wants a raw pointer
    std::cout << "legacy: " << *p << '\n';
}

int main() {
    auto p = std::make_unique<int>(1);

    legacyPrint(p.get());                   // .get(): the raw pointer, still owned by p

    p.reset(new int{2});                    // .reset(ptr): delete the old int, own the new one
    std::cout << *p << '\n';

    p.reset();                              // .reset(): delete the int, p becomes empty
    std::cout << (p == nullptr) << '\n';

    p = std::make_unique<int>(3);           // assigning also deletes whatever p held before
    int* raw = p.release();                 // .release(): give up ownership WITHOUT deleting
    std::cout << *raw << ' ' << (p == nullptr) << '\n';
    delete raw;                             // after release, it's your job again
}
```

```output
legacy: 1
2
1
3 1
```

> **Warning:** Never `delete` the pointer you got from `.get()`. The `unique_ptr` still owns it and
> will delete it again (double delete). And never create two smart pointers from the same raw pointer.

### `unique_ptr<T[]>` for arrays

For a heap array, use the `T[]` form. It calls `delete[]` and provides `[]` indexing:

```cpp run
#include <iostream>
#include <memory>

int main() {
    int n = 5;
    auto squares = std::make_unique<int[]>(n);   // n ints, all value-initialized to 0
    for (int i = 0; i < n; ++i) {
        squares[i] = i * i;
    }
    std::cout << squares[3] << ' ' << squares[4] << '\n';
}   // delete[] happens automatically
```

```output
9 16
```

In practice, `std::vector` is almost always better than `unique_ptr<T[]>` because it knows its size and
can grow. `unique_ptr<T[]>` is handy when you need a fixed buffer and want to be explicit about it.

## `std::shared_ptr`: shared ownership

Sometimes several parts of a program need to keep the same object alive, and there's no single obvious
owner. A `std::shared_ptr<T>` keeps a **reference count**: how many `shared_ptr`s currently own the
object. Copying increases the count, destroying or resetting decreases it, and when it reaches zero
the object is deleted.

```cpp run
#include <iostream>
#include <memory>

int main() {
    auto a = std::make_shared<int>(100);   // count = 1
    std::cout << "count: " << a.use_count() << '\n';

    {
        std::shared_ptr<int> b = a;        // copying is allowed: count = 2
        auto c = b;                        // count = 3
        *c += 1;                           // all three point to the same int
        std::cout << "count: " << a.use_count() << ", value: " << *a << '\n';
    }                                      // b and c destroyed: count = 1

    std::cout << "count: " << a.use_count() << '\n';

    a.reset();                             // count = 0: the int is deleted now
    std::cout << "count: " << a.use_count() << '\n';
}
```

```output
count: 1
count: 3, value: 101
count: 1
count: 0
```

Notes:

- Prefer `std::make_shared<T>(args...)`: it allocates the object and the reference count in one go.
- A `shared_ptr` can be created from a `unique_ptr` by moving: `std::shared_ptr<int> s = std::move(u);`.
  The reverse is not possible.
- `shared_ptr` costs more than `unique_ptr`: it's twice the size, and updating the count is an atomic
  (thread-safe) operation. Don't use it "just in case".

## `std::weak_ptr`: observing without owning

A `std::weak_ptr<T>` refers to an object managed by `shared_ptr`s, **without** keeping it alive (it
doesn't increase the count). Since the object may have died, you can't use a `weak_ptr` directly.
Instead you ask for a temporary `shared_ptr` with `.lock()`, which is empty if the object is gone:

```cpp run
#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_shared<int>(7);
    std::weak_ptr<int> observer = owner;            // count stays 1

    std::cout << "count: " << owner.use_count() << '\n';
    std::cout << "expired? " << observer.expired() << '\n';

    if (auto sp = observer.lock()) {                // a shared_ptr, or empty
        std::cout << "still alive: " << *sp << '\n';
    }

    owner.reset();                                  // last owner gone: int deleted

    std::cout << "expired? " << observer.expired() << '\n';
    if (!observer.lock()) {
        std::cout << "object is gone\n";
    }
}
```

```output
count: 1
expired? 0
still alive: 7
expired? 1
object is gone
```

### Breaking reference cycles

`weak_ptr`'s most important job is breaking **cycles**. If two objects own each other through
`shared_ptr`s, neither count ever reaches zero, and both leak:

```cpp run
#include <iostream>
#include <memory>

struct Person {
    const char* name;
    std::shared_ptr<Person> friendPtr;   // owning link
    Person(const char* n) : name{n} {}
    ~Person() { std::cout << name << " destroyed\n"; }
};

int main() {
    auto alice = std::make_shared<Person>("Alice");
    auto bob = std::make_shared<Person>("Bob");
    alice->friendPtr = bob;
    bob->friendPtr = alice;              // cycle: each keeps the other alive
    std::cout << "end of main\n";
}   // alice and bob go out of scope, but each Person still has count 1: LEAK
```

```output
end of main
```

No "destroyed" lines: both objects leaked. Making one direction (or both) a `weak_ptr` fixes it,
because weak links don't count:

```cpp run
#include <iostream>
#include <memory>

struct Person {
    const char* name;
    std::weak_ptr<Person> friendPtr;     // non-owning link
    Person(const char* n) : name{n} {}
    ~Person() { std::cout << name << " destroyed\n"; }
};

int main() {
    auto alice = std::make_shared<Person>("Alice");
    auto bob = std::make_shared<Person>("Bob");
    alice->friendPtr = bob;
    bob->friendPtr = alice;
    if (auto f = alice->friendPtr.lock()) {
        std::cout << "Alice's friend is " << f->name << '\n';
    }
    std::cout << "end of main\n";
}
```

```output
Alice's friend is Bob
end of main
Bob destroyed
Alice destroyed
```

(Locals are destroyed in reverse order of creation, so `bob` goes first.) Typical uses: a child
pointing back to its parent, observers, and caches.

## Choosing a pointer

| You need | Use |
| --- | --- |
| A single object you own on the heap | `std::unique_ptr<T>` + `std::make_unique` (the default) |
| A run-time sized collection | `std::vector<T>` (not a smart pointer at all) |
| An object kept alive by several owners | `std::shared_ptr<T>` + `std::make_shared` |
| To observe a shared object without keeping it alive / break a cycle | `std::weak_ptr<T>` |
| To use (not own) an object that must exist | `T&` or `const T&` |
| To use (not own) an object that may be absent | raw `T*` (non-owning, may be `nullptr`) |

In modern C++, **a raw pointer means "I'm just looking"**. It never owns. Ownership is always expressed
with a smart pointer or a container.

> **Tip:** Don't reach for the heap at all unless you need to. A plain local variable
> (`Widget w;`) is simpler and faster than `auto w = std::make_unique<Widget>();`.

:::quiz
What happens when a `std::unique_ptr` goes out of scope?

- [ ] Nothing; you must call `delete` on it
- [x] It deletes the object it owns (if any)
- [ ] It copies the object to the stack
- [ ] It decrements a reference count

`unique_ptr`'s destructor deletes the owned object. There's no reference count; that's `shared_ptr`.
:::

:::quiz
After this code, what is `a.use_count()`?

```cpp
auto a = std::make_shared<int>(1);
auto b = a;
std::weak_ptr<int> w = a;
{
    auto c = b;
}
```

- [ ] `1`
- [x] `2`
- [ ] `3`
- [ ] `4`

`a` and `b` own it (2). `c` was a third owner but was destroyed at the end of its block. A `weak_ptr`
doesn't count.
:::

:::quiz
Which line does NOT compile?

```cpp
auto p = std::make_unique<int>(3);   // 1
auto q = p;                          // 2
auto r = std::move(p);               // 3
std::shared_ptr<int> s = std::move(r); // 4
```

- [ ] 1
- [x] 2
- [ ] 3
- [ ] 4

A `unique_ptr` can't be copied, only moved. Moving a `unique_ptr` into a `shared_ptr` (line 4) is allowed.
:::

:::exercise Make it unique {easy}
Read an integer `x`. Store it in a `std::unique_ptr<int>` created with `std::make_unique`, then square
the value **through the smart pointer** and print it. Don't use `new` or `delete`.

**Input:** one integer `x` (between -40000 and 40000).
**Output:** `x * x`, followed by a newline.

```cpp starter
#include <iostream>
#include <memory>

int main() {
    int x;
    std::cin >> x;
    int* p = new int{x};
    std::cout << *p << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>

int main() {
    int x;
    std::cin >> x;
    auto p = std::make_unique<int>(x);
    *p = *p * *p;
    std::cout << *p << '\n';
}
```

```hint
`auto p = std::make_unique<int>(x);` then use `*p` just like a raw pointer. No `delete` needed.
```

```stdin
7
```

```expected
49
```

```stdin
-12
```

```expected
144
```

```stdin
0
```

```expected hidden
0
```

```stdin
-40000
```

```expected hidden
1600000000
```

```checks
must std::make_unique\s*<\s*int\s*> :: Create the smart pointer with std::make_unique<int>.
mustnot \bnew\b :: Don't use new: make_unique does the allocation.
mustnot \bdelete\b :: Don't use delete: the unique_ptr frees the memory.
```
:::

:::exercise Pass the baton {medium}
Practice moving ownership. Read an integer `x` and:

1. create `auto first = std::make_unique<int>(x);`
2. move it into `std::unique_ptr<int> second`,
3. print the state of both,
4. pass `second` into a function `int finish(std::unique_ptr<int> p)` that returns `*p * 2`,
5. print the result and the state of `second` afterwards.

A state is printed as `empty` if the pointer owns nothing, otherwise the value it owns.

**Input:** one integer `x`.
**Output:** exactly these three lines:

```
first=empty second=<x>
result=<2x>
second=empty
```

```cpp starter
#include <iostream>
#include <memory>
#include <utility>

int finish(std::unique_ptr<int> p) {
    return *p * 2;
}

int main() {
    int x;
    std::cin >> x;
    auto first = std::make_unique<int>(x);

    std::cout << "first=" << *first << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <utility>

int finish(std::unique_ptr<int> p) {
    return *p * 2;
}

std::string state(const std::unique_ptr<int>& p) {
    return p ? std::to_string(*p) : "empty";
}

int main() {
    int x;
    std::cin >> x;
    auto first = std::make_unique<int>(x);
    std::unique_ptr<int> second = std::move(first);

    std::cout << "first=" << state(first) << " second=" << state(second) << '\n';

    int result = finish(std::move(second));
    std::cout << "result=" << result << '\n';
    std::cout << "second=" << state(second) << '\n';
}
```

```hint
`std::unique_ptr<int> second = std::move(first);` transfers ownership; `first` becomes null.
```

```hint
A `unique_ptr` converts to `bool`: `if (p)` is true when it owns something. To pass `second` to
`finish`, you must write `finish(std::move(second))`.
```

```stdin
21
```

```expected
first=empty second=21
result=42
second=empty
```

```stdin
-4
```

```expected
first=empty second=-4
result=-8
second=empty
```

```stdin
0
```

```expected hidden
first=empty second=0
result=0
second=empty
```

```checks
must std::move\s*\(\s*first\s*\) :: Move first into second with std::move(first).
must finish\s*\(\s*std::move\s*\(\s*second\s*\)\s*\) :: Pass second into finish with std::move.
```
:::

:::exercise Shared ownership count {medium}
Read `n` (0 to 10). Create `auto original = std::make_shared<int>(n);` and a `std::weak_ptr<int>`
watcher of it. Then:

1. put `n` copies of `original` into a `std::vector<std::shared_ptr<int>>` and print the use count,
2. clear the vector and print the use count,
3. print whether the watcher has expired,
4. reset `original` and print whether the watcher has expired.

**Input:** one integer `n`.
**Output:** exactly four lines (`yes`/`no` for expired):

```
owners=<count>
after clear=<count>
expired=<yes|no>
expired=<yes|no>
```

```cpp starter
#include <iostream>
#include <memory>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    auto original = std::make_shared<int>(n);

    std::cout << "owners=" << 1 << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    auto original = std::make_shared<int>(n);
    std::weak_ptr<int> watcher = original;

    std::vector<std::shared_ptr<int>> copies;
    for (int i = 0; i < n; ++i) {
        copies.push_back(original);
    }
    std::cout << "owners=" << original.use_count() << '\n';

    copies.clear();
    std::cout << "after clear=" << original.use_count() << '\n';

    std::cout << "expired=" << (watcher.expired() ? "yes" : "no") << '\n';
    original.reset();
    std::cout << "expired=" << (watcher.expired() ? "yes" : "no") << '\n';
}
```

```hint
Each `copies.push_back(original);` copies the `shared_ptr` and adds one to the count. `.use_count()`
returns the count.
```

```hint
A `weak_ptr` doesn't add to the count. `.expired()` becomes true once the last `shared_ptr` lets go.
```

```stdin
3
```

```expected
owners=4
after clear=1
expired=no
expired=yes
```

```stdin
0
```

```expected
owners=1
after clear=1
expired=no
expired=yes
```

```stdin
10
```

```expected hidden
owners=11
after clear=1
expired=no
expired=yes
```

```checks
must use_count\s*\(\s*\) :: Print the count with use_count().
must std::weak_ptr :: Watch the object with a std::weak_ptr.
must expired\s*\(\s*\) :: Check the watcher with expired().
```
:::

:::exercise Running totals buffer {easy}
Read `n` (1 or more) and allocate a buffer of `n` ints with `std::make_unique<int[]>(n)`. Read the `n`
values into it, then replace each element with the **running total** up to and including it, and print
the buffer.

**Input:** `n`, then `n` integers.
**Output:** the running totals separated by single spaces, followed by a newline.

Example: `4` / `1 2 3 4` prints `1 3 6 10`.

```cpp starter
#include <iostream>
#include <memory>

int main() {
    int n;
    std::cin >> n;
    // allocate with std::make_unique<int[]>(n)
}
```

```cpp solution
#include <iostream>
#include <memory>

int main() {
    int n;
    std::cin >> n;
    auto buffer = std::make_unique<int[]>(n);
    for (int i = 0; i < n; ++i) {
        std::cin >> buffer[i];
    }
    for (int i = 1; i < n; ++i) {
        buffer[i] += buffer[i - 1];
    }
    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << buffer[i];
    }
    std::cout << '\n';
}
```

```hint
`auto buffer = std::make_unique<int[]>(n);` gives a `std::unique_ptr<int[]>`, which supports `buffer[i]`.
```

```hint
Running total in place: for `i` from 1, `buffer[i] += buffer[i - 1];`.
```

```stdin
4
1 2 3 4
```

```expected
1 3 6 10
```

```stdin
1
-5
```

```expected
-5
```

```stdin
5
10 -10 10 -10 3
```

```expected hidden
10 0 10 0 3
```

```stdin
3
-1 -1 -1
```

```expected hidden
-1 -2 -3
```

```checks
must make_unique\s*<\s*int\s*\[\s*\]\s*> :: Allocate with std::make_unique<int[]>(n).
mustnot \bnew\b :: Don't use new.
mustnot std::vector :: Use the unique_ptr<int[]> buffer instead of std::vector.
```
:::

:::exercise Owning linked list {hard}
A **singly linked list** stores each value in its own heap node, and each node points to the next one.
Here every link **owns** the rest of the list, so the whole list is freed automatically:

```cpp
struct Node {
    int value = 0;
    std::unique_ptr<Node> next;   // owns the following node (empty at the end of the list)
};

std::unique_ptr<Node> head;       // owns the first node (empty when the list is empty)
```

Process commands until the input ends:

| Command | Effect |
| --- | --- |
| `push X` | insert `X` at the front |
| `append X` | insert `X` at the back |
| `pop` | remove the front node, or print `empty` if there is none |
| `remove X` | remove the **first** node holding `X`, or print `not found` |
| `reverse` | reverse the list **in place**, by relinking the existing nodes |
| `print` | print the values front to back, separated by spaces, or `(empty)` |

Use `std::make_unique` and `std::move` only: no `new`, `delete`, `std::vector` or `std::list`.

**Input:** at most 1000 commands, one per line.
**Output:** one line for each `print` and for each failed `pop` or `remove`.

```cpp starter
#include <iostream>
#include <memory>

struct Node {
    int value = 0;
    std::unique_ptr<Node> next;
};

int main() {
    std::unique_ptr<Node> head;
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Node {
    int value = 0;
    std::unique_ptr<Node> next;
};

void pushFront(std::unique_ptr<Node>& head, int value) {
    auto node = std::make_unique<Node>();
    node->value = value;
    node->next = std::move(head);        // the old list now hangs off the new node
    head = std::move(node);
}

void pushBack(std::unique_ptr<Node>& head, int value) {
    std::unique_ptr<Node>* link = &head; // a pointer to the link we may have to fill
    while (*link) {
        link = &(*link)->next;
    }
    *link = std::make_unique<Node>();
    (*link)->value = value;
}

bool popFront(std::unique_ptr<Node>& head) {
    if (!head) {
        return false;
    }
    head = std::move(head->next);        // the old first node is deleted here
    return true;
}

bool removeFirst(std::unique_ptr<Node>& head, int value) {
    std::unique_ptr<Node>* link = &head;
    while (*link && (*link)->value != value) {
        link = &(*link)->next;
    }
    if (!*link) {
        return false;
    }
    *link = std::move((*link)->next);    // unlink it: the node is deleted, the rest stays
    return true;
}

void reverse(std::unique_ptr<Node>& head) {
    std::unique_ptr<Node> reversed;      // the part that is already reversed
    while (head) {
        std::unique_ptr<Node> rest = std::move(head->next);
        head->next = std::move(reversed);
        reversed = std::move(head);
        head = std::move(rest);
    }
    head = std::move(reversed);
}

void print(const std::unique_ptr<Node>& head) {
    if (!head) {
        std::cout << "(empty)\n";
        return;
    }
    for (const Node* p = head.get(); p != nullptr; p = p->next.get()) {   // raw pointers just look
        std::cout << p->value << (p->next ? " " : "\n");
    }
}

int main() {
    std::unique_ptr<Node> head;
    std::string command;
    while (std::cin >> command) {
        if (command == "push" || command == "append" || command == "remove") {
            int x;
            std::cin >> x;
            if (command == "push") pushFront(head, x);
            else if (command == "append") pushBack(head, x);
            else if (!removeFirst(head, x)) std::cout << "not found\n";
        } else if (command == "pop") {
            if (!popFront(head)) std::cout << "empty\n";
        } else if (command == "reverse") {
            reverse(head);
        } else if (command == "print") {
            print(head);
        }
    }
}
```

```hint
Pass the list to your functions as `std::unique_ptr<Node>& head`, so they can change which node is
first. To read the list without owning anything, walk a raw `const Node*` from `head.get()` through
`p->next.get()`.
```

```hint
Inserting at the front: create the node, `node->next = std::move(head);`, then `head = std::move(node);`.
Removing the front: `head = std::move(head->next);`.
```

```hint
For `append` and `remove`, walk a **pointer to a link**: `std::unique_ptr<Node>* link = &head;` and
advance with `link = &(*link)->next;`. When it stops, `*link` is exactly the `unique_ptr` you have to
fill (append) or replace with `std::move((*link)->next)` (remove).
```

```hint
To reverse, repeatedly take the first node off the list and push it onto the front of a second list,
`reversed`. When the original is empty, move `reversed` back into `head`.
```

```stdin
push 2
push 1
append 3
print
reverse
print
```

```expected
1 2 3
3 2 1
```

```stdin
print
pop
append 5
remove 7
remove 5
print
```

```expected
(empty)
empty
not found
(empty)
```

```stdin
append 1
append 2
append 1
append 3
remove 1
print
remove 3
print
append 4
pop
print
```

```expected hidden
2 1 3
2 1
1 4
```

```stdin
reverse
print
push 9
reverse
print
append 8
push 7
reverse
print
```

```expected hidden
(empty)
9
8 9 7
```

```stdin
append -1
append -2
append -3
reverse
remove -2
append 0
reverse
print
pop
pop
pop
pop
print
```

```expected hidden
0 -1 -3
empty
(empty)
```

```checks
must std::unique_ptr\s*<\s*Node\s*> :: Link the nodes with std::unique_ptr<Node>.
mustnot \bnew\b|\bdelete\b :: Let the unique_ptrs allocate and free the nodes (no new or delete).
mustnot std::vector|std::list|std::deque|std::forward_list :: Build the list from your own nodes.
```
:::
