---
title: Dynamic Memory (new & delete)
summary: Allocating objects and arrays on the heap with new and new[], freeing them with delete and delete[], and the bugs that come with doing it by hand.
---

Every variable so far had its lifetime decided by where it was declared: locals die at the end of their
scope, globals live forever. Sometimes you need more control:

- you only learn **how much** memory you need at run time (say, the user types a size),
- an object must **outlive** the function that created it,
- the data is too **big** for the stack.

For that, you allocate on the **heap** (free store) with `new`, and give the memory back with
`delete`. This lesson shows how that works by hand, so you understand what `std::vector` and smart
pointers do for you. Spoiler: in modern C++ you'll rarely write `new` yourself.

## `new` and `delete` for a single object

`new T` allocates memory for one `T` on the heap, creates the object there, and returns a **pointer**
to it. The object has no name, so the pointer is your only way to reach it. `delete p` destroys the
object and releases the memory.

```cpp run
#include <iostream>

int main() {
    int* p = new int{42};     // allocate an int on the heap, initialized to 42
    std::cout << *p << '\n';

    *p += 8;                  // use it like any pointed-to int
    std::cout << *p << '\n';

    delete p;                 // give the memory back
    p = nullptr;              // good habit: don't leave a dangling pointer around
}
```

```output
42
50
```

All the ways to initialize:

```cpp
int* a = new int;        // UNinitialized: holds garbage until you assign
int* b = new int();      // value-initialized: 0
int* c = new int{};      // value-initialized: 0 (brace form)
int* d = new int(7);     // 7
int* e = new int{7};     // 7 (brace form, preferred: no narrowing)
auto* f = new double{2.5}; // auto deduces double*
```

Every one of those needs its own `delete` later.

### The heap object outlives its scope

Unlike a local variable, a heap object stays alive until you `delete` it, even after the function
that created it returns. That makes it safe to return its pointer (unlike a pointer to a local):

```cpp run
#include <iostream>

int* makeCounter(int start) {
    int* counter = new int{start};
    return counter;               // OK: the heap int survives the return
}

int main() {
    int* c = makeCounter(10);
    ++*c;
    std::cout << *c << '\n';
    delete c;                     // the caller now owns it and must free it
}
```

```output
11
```

But notice the new burden: `makeCounter` created the object and `main` must remember to destroy it.
Whoever is responsible for deleting an object is called its **owner**, and with raw pointers ownership
exists only in comments and in your head.

## `new[]` and `delete[]` for arrays

To allocate an array, use `new T[n]`. Unlike a C array on the stack, `n` can be **any run-time value**:

```cpp run
#include <iostream>

int main() {
    int n = 5;                         // imagine this came from std::cin

    int* squares = new int[n];         // n uninitialized ints
    for (int i = 0; i < n; ++i) {
        squares[i] = i * i;            // index it like an array
    }
    for (int i = 0; i < n; ++i) {
        std::cout << squares[i] << ' ';
    }
    std::cout << '\n';

    delete[] squares;                  // arrays need delete[] (with brackets)

    int* zeros = new int[n]{};         // all elements value-initialized to 0
    int* some = new int[n]{1, 2, 3};   // 1, 2, 3, 0, 0
    std::cout << zeros[4] << ' ' << some[2] << ' ' << some[4] << '\n';
    delete[] zeros;
    delete[] some;
}
```

```output
0 1 4 9 16
0 3 0
```

The pointer returned by `new[]` points to the first element, so everything from the pointers-and-arrays
lesson applies: `p[i]`, pointer arithmetic, passing `p` plus a size to functions. And just like a
decayed array, the pointer **doesn't know the size**: you have to keep track of `n` yourself.

> **Note:** `int arr[n];` with a run-time `n` (a "variable-length array") is **not** standard C++.
> GCC accepts it as an extension, but other compilers reject it, and a large `n` overflows the stack.
> Use `std::vector<int> arr(n);` instead.

### Match the forms: `new` with `delete`, `new[]` with `delete[]`

| Allocated with | Free with |
| --- | --- |
| `new T` | `delete p` |
| `new T[n]` | `delete[] p` |

Mixing them up is **undefined behavior**. It might seem to work for `int`s and then corrupt memory for
types with destructors:

```cpp
int* arr = new int[10];
delete arr;        // WRONG: undefined behavior, must be delete[] arr

int* one = new int{1};
delete[] one;      // WRONG: undefined behavior, must be delete one
```

GCC can sometimes warn about this (`-Wmismatched-new-delete`), but not always.

## The bugs of manual memory management

### 1. Memory leaks

If you lose the last pointer to a heap object without deleting it, that memory can never be freed
(until the program ends). That's a **memory leak**:

```cpp
void leaky() {
    int* data = new int[1000];
    // ... use data ...
}   // forgot delete[] data: 4000 bytes lost on every call

void alsoLeaky() {
    int* p = new int{1};
    p = new int{2};      // the first int is now unreachable: leaked
    delete p;            // frees only the second one
}
```

A leak in a short program is harmless (the OS reclaims everything at exit), but in a server or game
that runs for days, leaks pile up until the program runs out of memory.

The sneakiest leaks come from **early exits**: a `return`, `break`, or exception that skips the `delete`:

```cpp
bool process(int n) {
    int* buffer = new int[n];
    if (n > 100) {
        return false;    // leak! the delete[] below never runs
    }
    // ...
    delete[] buffer;
    return true;
}
```

### 2. Double delete

Deleting the same memory twice is undefined behavior (often a crash, sometimes silent heap corruption):

```cpp
int* p = new int{5};
int* q = p;         // two pointers, one object
delete p;
delete q;           // UB: already deleted
```

Setting a pointer to `nullptr` after deleting helps, because **`delete nullptr` is guaranteed to do
nothing**. But it doesn't help with *copies* of the pointer, like `q` above.

### 3. Use after free (dangling pointers again)

```cpp
int* p = new int{5};
delete p;
std::cout << *p;    // UB: the memory was released
```

### 4. Deleting something that wasn't `new`ed

```cpp
int x = 5;
int* p = &x;
delete p;           // UB: x is on the stack, not the heap
```

### What if `new` fails?

If the heap is exhausted, `new` **throws an exception** of type `std::bad_alloc` (exceptions come in a
later module). It never returns `nullptr`, so checking `if (p == nullptr)` after a plain `new` is
pointless. (The rarely used `new (std::nothrow) int` form returns `nullptr` instead.)

## A complete example: a run-time sized buffer

Here everything is done correctly by hand. Note how much care it takes:

```cpp run
#include <iostream>

double average(const double* values, int count) {
    double total = 0;
    for (int i = 0; i < count; ++i) total += values[i];
    return count > 0 ? total / count : 0.0;
}

int main() {
    int count = 4;                         // pretend this was read from the user
    double* readings = new double[count]{20.5, 21.0, 19.5, 22.0};

    std::cout << "average: " << average(readings, count) << '\n';

    delete[] readings;                     // exactly once, with brackets
    readings = nullptr;
}
```

```output
average: 20.75
```

## Why raw `new`/`delete` is rare in modern C++

Every `new` creates an obligation: exactly one matching `delete`, of the right form, on every path out
of the code, never twice, and nobody may use the pointer afterward. Humans are bad at keeping such
promises, which is why leaks and use-after-free bugs are among the most common security holes in C
and C++ programs.

Modern C++ solves this by tying the memory to an object that **cleans up automatically** when it goes
out of scope (an idea called RAII, explained in the next lesson):

| Instead of | Use |
| --- | --- |
| `new T[n]` / `delete[]` | `std::vector<T>` (or `std::string` for text) |
| `new T` / `delete` for one owned object | `std::unique_ptr<T>` via `std::make_unique<T>()` |
| an object several owners share | `std::shared_ptr<T>` via `std::make_shared<T>()` |

```cpp run
#include <iostream>
#include <vector>

int main() {
    int n = 5;
    std::vector<int> squares(n);       // heap memory, sized at run time...
    for (int i = 0; i < n; ++i) squares[i] = i * i;
    std::cout << squares[4] << '\n';
}                                      // ...freed automatically here. No delete, no leak.
```

```output
16
```

The C++ Core Guidelines put it bluntly: **"Avoid calling `new` and `delete` explicitly."** Still, you
need to know them to read older code, to understand what containers do internally, and for the rare
low-level code that really needs them.

:::quiz
Which pairings are correct? (select all that apply)

- [x] `int* p = new int{3};` ... `delete p;`
- [ ] `int* p = new int[3];` ... `delete p;`
- [x] `int* p = new int[3];` ... `delete[] p;`
- [ ] `int x = 3; int* p = &x;` ... `delete p;`

`new` pairs with `delete`, `new[]` with `delete[]`. Deleting memory that didn't come from `new` (like
the address of a local) is undefined behavior.
:::

:::quiz
What's wrong with this function?

```cpp
void f() {
    int* p = new int{1};
    p = new int{2};
    delete p;
}
```

- [ ] Nothing
- [ ] It deletes the same memory twice
- [x] The first int is leaked: its only pointer was overwritten
- [ ] `new int{2}` is a compile error

After `p = new int{2};`, nothing points to the first int anymore, so it can never be deleted.
:::

:::quiz
Is `delete p;` safe when `p` is `nullptr`?

- [x] Yes, deleting a null pointer does nothing
- [ ] No, it's undefined behavior
- [ ] No, it throws an exception
- [ ] Only for arrays

The standard guarantees `delete nullptr` (and `delete[] nullptr`) is a no-op, which is why setting
pointers to `nullptr` after deleting them prevents double-delete bugs through that pointer.
:::

:::exercise Heap integer {easy}
Read an integer, store it in an `int` allocated with `new`, triple the value through the pointer, print
it, and free the memory with `delete`.

**Input:** one integer.
**Output:** three times the integer, followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int value;
    std::cin >> value;

    // allocate an int on the heap holding value, triple it through the pointer,
    // print it, then delete it
}
```

```cpp solution
#include <iostream>

int main() {
    int value;
    std::cin >> value;

    int* p = new int{value};
    *p *= 3;
    std::cout << *p << '\n';
    delete p;
}
```

```hint
`int* p = new int{value};` creates the heap int. Use `*p` to read and modify it.
```

```stdin
14
```

```expected
42
```

```stdin
-3
```

```expected
-9
```

```stdin
0
```

```expected hidden
0
```

```checks
must new\s+int\b :: Allocate the int with new.
must delete\s+\w+ :: Free it with delete.
mustnot delete\s*\[\s*\] :: A single object is freed with delete, not delete[].
```
:::

:::exercise Run-time sized array {easy}
Read `n`, allocate an array of `n` ints with `new[]`, read `n` values into it, and print them in
**reverse** order. Then free it with `delete[]`.

**Input:** `n` (1 or more), then `n` integers.
**Output:** the values in reverse order, separated by single spaces, followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int* values = new int{n};   // hmm, is this an array?

    std::cout << *values << '\n';
    delete values;
}
```

```cpp solution
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int* values = new int[n];
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }

    for (int i = n - 1; i >= 0; --i) {
        std::cout << values[i];
        if (i > 0) std::cout << ' ';
    }
    std::cout << '\n';

    delete[] values;
}
```

```hint
`new int{n}` makes **one** int holding `n`. An array of `n` ints is `new int[n]` (square brackets).
```

```hint
Memory from `new[]` must be freed with `delete[] values;`.
```

```stdin
4
1 2 3 4
```

```expected
4 3 2 1
```

```stdin
1
99
```

```expected
99
```

```stdin
6
5 -1 0 8 8 -2
```

```expected hidden
-2 8 8 0 -1 5
```

```checks
must new\s+int\s*\[ :: Allocate the array with new int[n].
must delete\s*\[\s*\] :: Free the array with delete[].
mustnot std::vector :: Practice new[] here instead of std::vector.
```
:::

:::exercise Growing array {medium}
Build a tiny version of what `std::vector` does internally. Read integers until the input ends and
store them in a heap array that **grows**:

- Start with capacity 1: `int* data = new int[1];`.
- When the array is full and another number arrives, allocate a new array with **double** the capacity,
  copy the old elements over, `delete[]` the old array, and continue with the new one.

At the end, print the count, the final capacity, and the sum, then free the array.

**Input:** zero or more integers separated by whitespace.
**Output:** `count=<count> capacity=<capacity> sum=<sum>`, followed by a newline.

Example: 5 numbers make the capacity go 1 → 2 → 4 → 8, so the output starts `count=5 capacity=8`.

```cpp starter
#include <iostream>

int main() {
    int capacity = 1;
    int count = 0;
    int* data = new int[capacity];

    int x;
    while (std::cin >> x) {
        // grow if full, then store x
        ++count;
    }

    long long sum = 0;
    std::cout << "count=" << count << " capacity=" << capacity << " sum=" << sum << '\n';
    delete[] data;
}
```

```cpp solution
#include <iostream>

int main() {
    int capacity = 1;
    int count = 0;
    int* data = new int[capacity];

    int x;
    while (std::cin >> x) {
        if (count == capacity) {
            int newCapacity = capacity * 2;
            int* bigger = new int[newCapacity];
            for (int i = 0; i < count; ++i) {
                bigger[i] = data[i];
            }
            delete[] data;
            data = bigger;
            capacity = newCapacity;
        }
        data[count] = x;
        ++count;
    }

    long long sum = 0;
    for (int i = 0; i < count; ++i) {
        sum += data[i];
    }
    std::cout << "count=" << count << " capacity=" << capacity << " sum=" << sum << '\n';
    delete[] data;
}
```

```hint
Inside the loop, before storing: `if (count == capacity) { ... }`. Allocate `new int[capacity * 2]`,
copy `count` elements, `delete[]` the old pointer, then point `data` at the new array.
```

```hint
Don't forget to update `capacity` after growing, and to store `data[count] = x;` before `++count`.
```

```stdin
3 1 4 1 5
```

```expected
count=5 capacity=8 sum=14
```

```stdin
7
```

```expected
count=1 capacity=1 sum=7
```

```stdin

```

```expected hidden
count=0 capacity=1 sum=0
```

```stdin
1 2 3 4 5 6 7 8 9
```

```expected hidden
count=9 capacity=16 sum=45
```

```stdin
1 2 3 4
```

```expected hidden
count=4 capacity=4 sum=10
```

```stdin
2000000000 2000000000 -1
```

```expected hidden
count=3 capacity=4 sum=3999999999
```

```checks
must new\s+int\s*\[ :: Allocate arrays with new int[...].
must delete\s*\[\s*\] :: Free the old array with delete[].
mustnot std::vector :: Build the growing array yourself, without std::vector.
```
:::

:::exercise Merge on the heap {hard}
Read two lists of integers, each already sorted in non-decreasing order, into two arrays allocated with
`new int[...]` (sized exactly from the input). Write

```cpp
int* merge(const int* a, int n, const int* b, int m);
```

which allocates a **new** heap array of `n + m` ints, fills it with all the values of both lists in
sorted order, and returns it. The caller owns the result. Walk both inputs once, always taking the
smaller front value; don't sort.

Then print the merged list and the number of **distinct** values in it, and free all three arrays with
`delete[]`. Either list may be empty (`new int[0]` is allowed, and must still be deleted).

**Input:** `n` (0 to 1000), `n` sorted integers, then `m` (0 to 1000), `m` sorted integers.
**Output:** two lines: the merged values separated by single spaces (an empty line if there are none),
then `distinct=<count>`.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>

int* readArray(int& count) {
    std::cin >> count;
    int* values = new int[count];
    for (int i = 0; i < count; ++i) {
        std::cin >> values[i];
    }
    return values;                          // the caller must delete[] it
}

int* merge(const int* a, int n, const int* b, int m) {
    int* out = new int[n + m];
    int i = 0;
    int j = 0;
    int k = 0;
    while (i < n && j < m) {
        if (b[j] < a[i]) {
            out[k++] = b[j++];
        } else {
            out[k++] = a[i++];
        }
    }
    while (i < n) out[k++] = a[i++];        // whatever is left of a...
    while (j < m) out[k++] = b[j++];        // ...or of b
    return out;
}

int main() {
    int n = 0;
    int m = 0;
    int* a = readArray(n);
    int* b = readArray(m);
    int* merged = merge(a, n, b, m);

    int distinct = 0;
    for (int k = 0; k < n + m; ++k) {
        if (k > 0) std::cout << ' ';
        std::cout << merged[k];
        if (k == 0 || merged[k] != merged[k - 1]) {
            ++distinct;                     // sorted, so equal values are neighbours
        }
    }
    std::cout << "\ndistinct=" << distinct << '\n';

    delete[] merged;
    delete[] b;
    delete[] a;
}
```

```hint
Keep one index into each input and one into the output. While **both** inputs have values left, copy
the smaller front value and advance that input. When one runs out, copy the rest of the other.
```

```hint
Because the merged array is sorted, equal values sit next to each other: a value is new exactly when
it's the first one or differs from the one before it.
```

```hint
Every `new int[...]` needs exactly one `delete[]`, including the array `merge` returned.
```

```stdin
3
1 4 9
4
2 4 5 10
```

```expected
1 2 4 4 5 9 10
distinct=6
```

```stdin
0
3
-1 0 0
```

```expected
-1 0 0
distinct=2
```

```stdin
0
0
```

```expected hidden

distinct=0
```

```stdin
2
1 2
2
3 4
```

```expected hidden
1 2 3 4
distinct=4
```

```stdin
3
5 5 5
2
5 5
```

```expected hidden
5 5 5 5 5
distinct=1
```

```stdin
3
-5 0 7
1
-10
```

```expected hidden
-10 -5 0 7
distinct=4
```

```checks
must new\s+int\s*\[ :: Allocate the arrays with new int[...].
must delete\s*\[\s*\] :: Free every array with delete[].
must int\s*\*\s*merge\s*\(\s*const\s+int\s*\*\s*\w+\s*,\s*int\s+\w+\s*,\s*const\s+int\s*\*\s*\w+\s*,\s*int\s+\w+\s*\) :: Write int* merge(const int* a, int n, const int* b, int m).
mustnot std::vector|std::merge|std::sort :: Merge the heap arrays yourself.
```
:::
