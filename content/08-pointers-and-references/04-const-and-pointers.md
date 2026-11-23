---
title: const and Pointers
summary: Pointer to const, const pointer, and both. How to read any declaration right to left, and why const correctness matters.
---

A pointer involves **two** things: the pointer itself (an address) and the object it points to.
Either one, both, or neither can be `const`. That gives four combinations, and the syntax is famously
confusing, until you learn one simple reading rule.

## The reading rule: right to left

Read a pointer declaration **from right to left**, starting at the name. Say "pointer to" for `*`.

```cpp
int* p;                 // p is a pointer to int
const int* p;           // p is a pointer to int that is const       ("pointer to const int")
int const* p;           // p is a pointer to const int               (same thing!)
int* const p = &x;      // p is a const pointer to int
const int* const p = &x; // p is a const pointer to int that is const ("const pointer to const int")
```

The short version: **`const` applies to whatever is immediately to its left** (or, if there's nothing
to its left, to whatever is on its right). So:

- `const` **before** the `*` protects the **pointed-to value**.
- `const` **after** the `*` protects the **pointer itself**.

| Declaration | Can change `*p` (the value)? | Can change `p` (where it points)? | Name |
| --- | --- | --- | --- |
| `int* p` | yes | yes | pointer to int |
| `const int* p` | **no** | yes | pointer to const |
| `int const* p` | **no** | yes | pointer to const (same as above) |
| `int* const p` | yes | **no** | const pointer |
| `const int* const p` | **no** | **no** | const pointer to const |

## 1. Pointer to const: `const int*`

A **pointer to const** promises "I won't modify what I point to *through this pointer*". The pointer
itself can move around freely.

```cpp run
#include <iostream>

int main() {
    int a = 1;
    int b = 2;

    const int* p = &a;     // read-only view of a
    std::cout << *p << '\n';

    p = &b;                // fine: the pointer itself isn't const
    std::cout << *p << '\n';

    b = 20;                // fine: b itself isn't const, only the view through p is
    std::cout << *p << '\n';

    int const* q = &a;     // identical meaning, different spelling ("east const")
    std::cout << *q << '\n';
}
```

```output
1
2
20
1
```

Modifying through it is a compile error:

```cpp compile-error
int main() {
    int a = 1;
    const int* p = &a;
    *p = 5;   // error: assignment of read-only location '* p'
}
```

Notice the subtlety: `a` isn't const. `p` is just a **read-only window** onto it. You can always add
`const` like this (an `int*` converts to `const int*` automatically), but you can't remove it.

To point at a variable that **is** const, you *need* a pointer to const:

```cpp compile-error
int main() {
    const int limit = 10;
    int* p = &limit;   // error: invalid conversion from 'const int*' to 'int*'
}
```

```cpp
const int limit = 10;
const int* p = &limit;   // OK
```

If the compiler let you take a plain `int*` to `limit`, you could change a constant through it.

## 2. Const pointer: `int* const`

A **const pointer** always points to the same place (so it must be initialized), but the value
there can change:

```cpp run
#include <iostream>

int main() {
    int a = 1;
    int* const p = &a;   // p will point to a forever

    *p = 50;             // fine: the int isn't const
    std::cout << a << '\n';
}
```

```output
50
```

```cpp compile-error
int main() {
    int a = 1;
    int b = 2;
    int* const p = &a;
    p = &b;   // error: assignment of read-only variable 'p'
}
```

```cpp compile-error
int main() {
    int* const p;   // error: uninitialized 'const p'
}
```

Const pointers are less common than pointers to const. You'll see them used for "this pointer should
never be re-pointed by accident", for example a fixed `end` marker of a range.

## 3. Const pointer to const: `const int* const`

Neither can change. A completely read-only, fixed view:

```cpp compile-error
int main() {
    int a = 1;
    int b = 2;
    const int* const p = &a;
    *p = 5;    // error: read-only location
    p = &b;    // error: read-only variable
}
```

## Reading harder declarations

The right-to-left rule scales to anything:

```cpp
const char* name;             // pointer to const char (a read-only C string)
char* const buffer = data;    // const pointer to (modifiable) char
const int** pp;               // pointer to pointer to const int
int* const* pp2;              // pointer to const pointer to int
int** const pp3 = &p;         // const pointer to pointer to int
```

`const` and `auto` follow the same logic: with `const auto* p = &x;` the pointee is const; with
`auto* const p = &x;` the pointer is.

## Const correctness

**Const correctness** means: mark everything `const` that shouldn't change. For pointers, the most
important place is **function parameters**. If a function only reads through a pointer, make it a
pointer to const:

```cpp run
#include <iostream>

// Promises not to modify the array: callers can pass const arrays too.
int sum(const int* arr, int size) {
    int total = 0;
    for (int i = 0; i < size; ++i) {
        total += arr[i];
    }
    return total;
}

// Clearly modifies the array: the signature says so.
void fill(int* arr, int size, int value) {
    for (int i = 0; i < size; ++i) {
        arr[i] = value;
    }
}

int main() {
    const int primes[4]{2, 3, 5, 7};
    int scratch[3]{};

    std::cout << sum(primes, 4) << '\n';   // OK: const array -> const int*

    fill(scratch, 3, 9);
    std::cout << sum(scratch, 3) << '\n';  // OK: int* converts to const int*

    // fill(primes, 4, 0);  // error: can't pass const int* where int* is expected
}
```

```output
17
27
```

Benefits:

1. **The signature documents intent.** `const int*` says "input only"; `int*` says "I will change this".
2. **The compiler enforces it.** An accidental write inside `sum` is a compile error, not a bug.
3. **It accepts more arguments.** A function taking `const int*` works with both const and non-const
   data. A function taking `int*` rejects const data, so forgetting `const` makes your function
   *less* usable.

> **Tip:** Make `const` your default for pointer and reference parameters, and drop it only when the
> function really needs to modify the argument.

Notice that `const` on the pointer itself in a parameter (`int* const arr`) is rarely useful:
the pointer is a copy anyway, so changing it can't affect the caller.

### Iterating with const pointers

When you walk a read-only array with begin/end pointers, both are typically `const int*`. The `end`
marker can additionally be a const pointer, since it should never move:

```cpp run
#include <iostream>

int main() {
    const int temps[5]{12, 15, 9, 20, 14};

    const int* const end = temps + 5;      // never moves, never writes
    int warm = 0;
    for (const int* p = temps; p != end; ++p) {   // moves, never writes
        if (*p >= 14) ++warm;
    }
    std::cout << warm << " warm days\n";
}
```

```output
3 warm days
```

### Casting away const

`const_cast<int*>(p)` can remove const from a pointer. Modifying an object that was **originally
declared const** through such a pointer is undefined behavior. It exists for calling old C APIs that
forgot `const` but don't actually write. If you're reaching for it, your design is probably wrong.

:::quiz
Which declarations stop you from modifying the int through `p`? (select all that apply)

- [x] `const int* p`
- [x] `int const* p`
- [ ] `int* const p`
- [x] `const int* const p`

`const` to the left of `*` protects the pointed-to value. `int* const p` only stops `p` from being re-pointed.
:::

:::quiz
Read this declaration right to left: `char* const* names;`

- [ ] const pointer to pointer to char
- [x] pointer to const pointer to char
- [ ] pointer to pointer to const char
- [ ] const pointer to const char

From the right: `names` is a pointer (`*`) to a const (`const`) pointer (`*`) to char.
:::

:::quiz
A function `void print(int* arr, int n)` only reads the array. Why is `void print(const int* arr, int n)` better?

- [ ] It runs faster
- [x] It documents that the array is read-only, catches accidental writes, and accepts const arrays
- [ ] It makes a copy of the array
- [ ] It's required for arrays

`const int*` accepts both const and non-const arrays and turns accidental writes into compile errors.
It doesn't copy anything.
:::

:::exercise Name that pointer
Read one pointer declaration type (a whole line) and print its English name.

**Input:** exactly one of these lines:
`int*`, `const int*`, `int const*`, `int* const`, `const int* const`.
**Output:** the matching description, followed by a newline:

| Input | Output |
| --- | --- |
| `int*` | `pointer to int` |
| `const int*` | `pointer to const int` |
| `int const*` | `pointer to const int` |
| `int* const` | `const pointer to int` |
| `const int* const` | `const pointer to const int` |

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string decl;
    std::getline(std::cin, decl);

    if (decl == "int*") {
        std::cout << "pointer to int\n";
    }
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string decl;
    std::getline(std::cin, decl);

    if (decl == "int*") {
        std::cout << "pointer to int\n";
    } else if (decl == "const int*" || decl == "int const*") {
        std::cout << "pointer to const int\n";
    } else if (decl == "int* const") {
        std::cout << "const pointer to int\n";
    } else if (decl == "const int* const") {
        std::cout << "const pointer to const int\n";
    }
}
```

```hint
Read right to left. `const` after `*` makes the **pointer** const; `const` before `*` (on either side
of `int`) makes the **int** const.
```

```stdin
int const*
```

```expected
pointer to const int
```

```stdin
int* const
```

```expected
const pointer to int
```

```stdin
const int* const
```

```expected hidden
const pointer to const int
```

```stdin
const int*
```

```expected hidden
pointer to const int
```
:::

:::exercise Const-correct average
Write a function `double average(const int* values, int count)` that returns the average of the
values (or `0` if `count` is 0). The function must take a **pointer to const**, because the data in
`main` is stored in a `const` array.

**Input:** `n` (0 to 50), then `n` integers.
**Output:** the average, followed by a newline (print it with plain `std::cout << value`, so `2.5`
prints as `2.5` and `3.0` prints as `3`).

The starter doesn't compile. Fix the function signature, then implement it.

```cpp starter broken
#include <iostream>

double average(int* values, int count) {
    return 0;
}

int main() {
    int n;
    std::cin >> n;
    int input[50]{};
    for (int i = 0; i < n; ++i) {
        std::cin >> input[i];
    }

    int data[50]{};
    for (int i = 0; i < n; ++i) data[i] = input[i];
    const int* view = data;   // main only has read-only access

    std::cout << average(view, n) << '\n';
}
```

```cpp solution
#include <iostream>

double average(const int* values, int count) {
    if (count == 0) {
        return 0;
    }
    long long total = 0;
    for (int i = 0; i < count; ++i) {
        total += values[i];
    }
    return static_cast<double>(total) / count;
}

int main() {
    int n;
    std::cin >> n;
    int input[50]{};
    for (int i = 0; i < n; ++i) {
        std::cin >> input[i];
    }

    int data[50]{};
    for (int i = 0; i < n; ++i) data[i] = input[i];
    const int* view = data;   // main only has read-only access

    std::cout << average(view, n) << '\n';
}
```

```hint
Read the compiler error: it can't convert `const int*` to `int*`. Change the parameter to `const int* values`.
```

```hint
Divide as `double`: `static_cast<double>(total) / count`. Handle `count == 0` before dividing.
```

```stdin
4
1 2 3 4
```

```expected
2.5
```

```stdin
3
5 5 5
```

```expected
5
```

```stdin
0
```

```expected hidden
0
```

```stdin
2
-3 4
```

```expected hidden
0.5
```

```checks
must average\s*\(\s*(const\s+int|int\s+const)\s*\*\s*\w+ :: The parameter must be a pointer to const (const int* values).
```
:::

:::exercise Count in range
Read `n` (0 to 100) integers into an array, then two bounds `lo` and `hi`. Count how many values `v`
satisfy `lo <= v <= hi`, by walking a `const int*` from the start to a fixed end marker declared as a
**const pointer to const int** (`const int* const end = ...`).

**Input:** `n`, then `n` integers, then `lo hi`.
**Output:** the count, followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int values[100]{};
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }
    int lo, hi;
    std::cin >> lo >> hi;

    int count = 0;
    // declare: const int* const end = ...
    // loop with: const int* p

    std::cout << count << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    int values[100]{};
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }
    int lo, hi;
    std::cin >> lo >> hi;

    int count = 0;
    const int* const end = values + n;
    for (const int* p = values; p != end; ++p) {
        if (*p >= lo && *p <= hi) {
            ++count;
        }
    }

    std::cout << count << '\n';
}
```

```hint
`const int* const end = values + n;` is one past the last element you read, and it can't move or write.
```

```stdin
6
1 5 10 15 20 25
5 15
```

```expected
3
```

```stdin
0
1 100
```

```expected
0
```

```stdin
4
-5 -5 0 7
-5 -5
```

```expected hidden
2
```

```checks
must const\s+int\s*\*\s*const\s+\w+\s*= :: Declare the end marker as const int* const end = ...
must for\s*\(\s*const\s+int\s*\*\s*\w+ :: Loop with a const int* pointer.
```
:::
