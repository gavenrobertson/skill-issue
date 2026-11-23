---
title: Pointers & Functions
summary: Passing pointers to let functions modify arguments, optional output parameters, returning pointers safely, and function pointers for callbacks.
---

## Passing a pointer to modify the caller's variable

You know that passing by value gives the function a copy, and passing by reference lets it modify the
original. Passing a **pointer** is the third option, and the only one C has:

```cpp run
#include <iostream>

void byValue(int x)      { x = 100; std::cout << "copy: " << x << '\n'; }  // changes a copy
void byReference(int& x) { x = 200; }   // changes the original
void byPointer(int* x)   { *x = 300; }  // changes the original, through its address

int main() {
    int n = 0;

    byValue(n);
    std::cout << n << '\n';

    byReference(n);
    std::cout << n << '\n';

    byPointer(&n);          // the caller must pass the address explicitly
    std::cout << n << '\n';
}
```

```output
copy: 100
0
200
300
```

Note that the pointer **itself** is passed by value: the function gets a copy of the address. Changing
`*x` affects the caller's variable; changing `x` (re-pointing it) only affects the local copy.

### Pointer or reference?

| | `void f(int& x)` | `void f(int* x)` |
| --- | --- | --- |
| Call syntax | `f(n)` | `f(&n)` |
| Inside the function | `x = 5` | `*x = 5` |
| Can the caller pass "nothing"? | no | yes, `f(nullptr)` |
| Must the function check for null? | no | yes, if null is allowed |

Modern C++ guideline: use a **reference** when the argument is required, and a **pointer** when it's
**optional** (may be `nullptr`). Some codebases also like `f(&n)` because the `&` at the call site
makes it visible that `n` may change.

## Output parameters

A function can only `return` one value. Pointer or reference parameters are an old way to "return"
extra results, called **output parameters**:

```cpp run
#include <iostream>

// Returns false on failure. The results go into *quotient and (optionally) *remainder.
bool divide(int a, int b, int* quotient, int* remainder) {
    if (b == 0) {
        return false;
    }
    *quotient = a / b;
    if (remainder != nullptr) {     // caller may pass nullptr if they don't care
        *remainder = a % b;
    }
    return true;
}

int main() {
    int q = 0;
    int r = 0;

    if (divide(17, 5, &q, &r)) {
        std::cout << q << " remainder " << r << '\n';
    }
    if (divide(20, 6, &q, nullptr)) {   // skip the remainder
        std::cout << q << '\n';
    }
    if (!divide(1, 0, &q, &r)) {
        std::cout << "can't divide by zero\n";
    }
}
```

```output
3 remainder 2
3
can't divide by zero
```

You'll see this pattern a lot in C libraries and older C++ code. In modern C++ you can usually return
several values more clearly with a `std::pair`, a `std::tuple`, a struct, or a `std::optional`
(all coming in the next module).

## Swapping with pointers

The classic exercise, which C programmers had to write with pointers:

```cpp run
#include <iostream>

void swapValues(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 1;
    int y = 2;
    swapValues(&x, &y);
    std::cout << x << ' ' << y << '\n';
}
```

```output
2 1
```

(In real code, use `std::swap(x, y)` from `<utility>`.)

## Returning pointers

A function can return a pointer, for example to point at an element it found. Returning `nullptr` is
the natural way to say "not found":

```cpp run
#include <iostream>

// Returns a pointer to the first element equal to target, or nullptr.
int* find(int* arr, int size, int target) {
    for (int i = 0; i < size; ++i) {
        if (arr[i] == target) {
            return &arr[i];          // fine: the array belongs to the caller
        }
    }
    return nullptr;
}

int main() {
    int data[5]{4, 8, 15, 16, 23};

    if (int* p = find(data, 5, 15)) {   // declare and test in one go
        *p = 42;                         // modify the element we found
    }
    if (find(data, 5, 99) == nullptr) {
        std::cout << "99 not found\n";
    }
    for (int x : data) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
99 not found
4 8 42 16 23
```

### Never return a pointer to a local variable

A function's local variables die when it returns. A pointer to one is dangling the moment the caller
receives it:

```cpp
int* makeNumber() {
    int n = 42;
    return &n;      // warning: address of local variable 'n' returned
}

int* p = makeNumber();
std::cout << *p;    // undefined behavior: n no longer exists
```

GCC warns about this (`-Wreturn-local-addr`, on by default). Safe things to return a pointer to:

- something the **caller** passed in (an element of their array, as in `find` above),
- a global or `static` variable,
- memory allocated on the heap (next lesson), although then someone has to free it.

If you just want to return a value, **return it by value**. That's cheap in modern C++.

## Function pointers

Functions live in memory too, so you can have a pointer to a function. That lets you store "which
function to call" in a variable and pass behavior into other functions.

The syntax is unusual: the pointer's name goes in parentheses with a `*`, followed by the parameter list:

```cpp run
#include <iostream>

int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }

int main() {
    int (*op)(int, int) = add;       // op: pointer to a function taking (int, int), returning int
    std::cout << op(3, 4) << '\n';   // call through the pointer

    op = &multiply;                  // the & is optional for functions
    std::cout << (*op)(3, 4) << '\n'; // explicit dereference also works

    op = nullptr;                    // function pointers can be null too
    if (!op) std::cout << "no function\n";
}
```

```output
7
12
no function
```

The parentheses around `*op` matter. Without them, `int *op(int, int);` declares a **function** named
`op` that returns an `int*`.

### Making it readable with `using`

That syntax gets ugly fast, especially as a parameter. A **type alias** gives it a name:

```cpp
using BinaryOp = int (*)(int, int);   // BinaryOp is "pointer to function (int, int) -> int"
BinaryOp op = add;

typedef int (*OldBinaryOp)(int, int); // the older typedef spelling of the same thing
```

### Callbacks: passing functions to functions

The main use of function pointers is **callbacks**: you pass a function to another function, which
calls it. This lets one piece of code do many different things:

```cpp run
#include <iostream>

using Transform = int (*)(int);

int square(int x) { return x * x; }
int negate(int x) { return -x; }
int half(int x)   { return x / 2; }

void applyAll(int* arr, int size, Transform f) {
    for (int i = 0; i < size; ++i) {
        arr[i] = f(arr[i]);
    }
}

void print(const int* arr, int size) {
    for (int i = 0; i < size; ++i) std::cout << arr[i] << ' ';
    std::cout << '\n';
}

int main() {
    int values[4]{1, 2, 3, 4};

    applyAll(values, 4, square);
    print(values, 4);

    applyAll(values, 4, negate);
    print(values, 4);

    // An array of function pointers: a tiny "menu" of operations
    Transform steps[3]{negate, half, square};
    for (Transform step : steps) {
        applyAll(values, 4, step);
    }
    print(values, 4);
}
```

```output
1 4 9 16
-1 -4 -9 -16
0 4 16 64
```

The standard library uses this idea everywhere, for example `std::sort` can take a comparison function
to decide the order:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

bool descending(int a, int b) { return a > b; }

int main() {
    std::vector<int> v{3, 1, 4, 1, 5};
    std::sort(v.begin(), v.end(), descending);   // pass the function as a callback
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}
```

```output
5 4 3 1 1
```

> **Note:** Function pointers can only point to plain functions. Modern C++ usually passes behavior
> with **lambdas** (small unnamed functions written inline, like `[](int a, int b) { return a > b; }`)
> and stores it in **`std::function`** or a template parameter. You'll learn both in a later module;
> they build on exactly the callback idea shown here.

:::quiz
Given `void f(int* p) { p = nullptr; }` and a call `f(&x);`, what happens to `x`?

- [ ] `x` becomes 0
- [ ] `x` becomes null
- [x] Nothing: only the function's copy of the pointer changes
- [ ] It doesn't compile

The pointer is passed by value. Assigning to `p` re-points the local copy. Only `*p = ...` would affect `x`.
:::

:::quiz
What does `int (*fp)(double);` declare?

- [ ] A function `fp` that returns a pointer to int
- [x] A pointer `fp` to a function taking a `double` and returning `int`
- [ ] A pointer to an int, initialized with a double
- [ ] An array of functions

The parentheses group `*fp` first: `fp` is a pointer. What follows describes the function it points
to: parameters `(double)`, return type `int`.
:::

:::exercise Swap with pointers {easy}
Write `void swapInts(int* a, int* b)` that swaps the two integers its arguments point to. In `main`,
read two integers, call `swapInts(&x, &y)`, and print them.

**Input:** two integers `x y`.
**Output:** `y x` (the swapped values, separated by a space), followed by a newline.

```cpp starter
#include <iostream>

void swapInts(int* a, int* b) {
    int* temp = a;
    a = b;
    b = temp;
}

int main() {
    int x, y;
    std::cin >> x >> y;
    swapInts(&x, &y);
    std::cout << x << ' ' << y << '\n';
}
```

```cpp solution
#include <iostream>

void swapInts(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x, y;
    std::cin >> x >> y;
    swapInts(&x, &y);
    std::cout << x << ' ' << y << '\n';
}
```

```hint
The starter swaps the function's local copies of the **pointers**. Swap the **values** they point to
instead: `*a` and `*b`.
```

```stdin
3 7
```

```expected
7 3
```

```stdin
-1 -1
```

```expected
-1 -1
```

```stdin
0 2147483647
```

```expected hidden
2147483647 0
```

```checks
must void\s+swapInts\s*\(\s*int\s*\*\s*\w+\s*,\s*int\s*\*\s*\w+\s*\) :: Keep the signature void swapInts(int* a, int* b).
must swapInts\s*\(\s*&\s*x\s*,\s*&\s*y\s*\) :: Call it with swapInts(&x, &y).
mustnot std::swap :: Write the swap yourself.
```
:::

:::exercise Optional remainder {medium}
Write `bool divide(int a, int b, int* quotient, int* remainder)` like the one in the lesson: it
returns `false` if `b` is 0; otherwise it stores `a / b` in `*quotient` and, **only if `remainder` is
not `nullptr`**, stores `a % b` in `*remainder`.

`main` reads `a`, `b`, and a word: `both` or `quotient`. For `quotient`, call `divide` with
`nullptr` as the last argument.

**Input:** `a b word`.
**Output:** one line: `error` if `b` is 0; otherwise `<q> <r>` for `both`, or just `<q>` for `quotient`.

```cpp starter
#include <iostream>
#include <string>

bool divide(int a, int b, int* quotient, int* remainder) {
    *quotient = a / b;
    *remainder = a % b;
    return true;
}

int main() {
    int a, b;
    std::string word;
    std::cin >> a >> b >> word;

    int q = 0;
    int r = 0;
    // call divide and print the result
}
```

```cpp solution
#include <iostream>
#include <string>

bool divide(int a, int b, int* quotient, int* remainder) {
    if (b == 0) {
        return false;
    }
    *quotient = a / b;
    if (remainder != nullptr) {
        *remainder = a % b;
    }
    return true;
}

int main() {
    int a, b;
    std::string word;
    std::cin >> a >> b >> word;

    int q = 0;
    int r = 0;
    if (word == "both") {
        if (divide(a, b, &q, &r)) {
            std::cout << q << ' ' << r << '\n';
        } else {
            std::cout << "error\n";
        }
    } else {
        if (divide(a, b, &q, nullptr)) {
            std::cout << q << '\n';
        } else {
            std::cout << "error\n";
        }
    }
}
```

```hint
Check `b == 0` first and `return false;`. Then guard the remainder write with `if (remainder != nullptr)`.
```

```hint
In `main`, pass `&q, &r` for `both`, and `&q, nullptr` for `quotient`.
```

```stdin
17 5 both
```

```expected
3 2
```

```stdin
17 5 quotient
```

```expected
3
```

```stdin
4 0 both
```

```expected hidden
error
```

```stdin
-7 2 both
```

```expected hidden
-3 -1
```

```stdin
4 0 quotient
```

```expected hidden
error
```

```stdin
-7 2 quotient
```

```expected hidden
-3
```

```checks
must nullptr :: Pass nullptr when the remainder isn't wanted, and check for it.
must divide\s*\([^;]*&\s*q :: Pass the address of q to divide.
```
:::

:::exercise Pocket calculator {medium}
Implement `add`, `subtract`, and `multiply` as functions `int f(int, int)`. Define an alias
`using BinaryOp = int (*)(int, int);` and write `BinaryOp pick(char symbol)` that returns the matching
function for `+`, `-`, or `*`, or `nullptr` for any other symbol. `main` must call the operation
**through the function pointer** returned by `pick`.

**Input:** `a op b`, for example `6 * 7` (separated by spaces).
**Output:** the result, or `unknown operator` if `pick` returned `nullptr`, followed by a newline.

```cpp starter
#include <iostream>

int add(int a, int b) { return a + b; }

int main() {
    int a, b;
    char op;
    std::cin >> a >> op >> b;
    std::cout << add(a, b) << '\n';
}
```

```cpp solution
#include <iostream>

int add(int a, int b) { return a + b; }
int subtract(int a, int b) { return a - b; }
int multiply(int a, int b) { return a * b; }

using BinaryOp = int (*)(int, int);

BinaryOp pick(char symbol) {
    switch (symbol) {
        case '+': return add;
        case '-': return subtract;
        case '*': return multiply;
        default: return nullptr;
    }
}

int main() {
    int a, b;
    char op;
    std::cin >> a >> op >> b;

    BinaryOp f = pick(op);
    if (f == nullptr) {
        std::cout << "unknown operator\n";
    } else {
        std::cout << f(a, b) << '\n';
    }
}
```

```hint
`using BinaryOp = int (*)(int, int);` then `BinaryOp pick(char symbol)` can `return add;` (a function
name converts to a pointer to it).
```

```hint
In `main`: `BinaryOp f = pick(op);`, check `f` for `nullptr`, then call `f(a, b)`.
```

```stdin
6 * 7
```

```expected
42
```

```stdin
10 - 25
```

```expected
-15
```

```stdin
3 + 4
```

```expected hidden
7
```

```stdin
8 / 2
```

```expected hidden
unknown operator
```

```stdin
-3 * -4
```

```expected hidden
12
```

```checks
must using\s+BinaryOp\s*=\s*int\s*\(\s*\*\s*\)\s*\(\s*int\s*,\s*int\s*\) :: Define using BinaryOp = int (*)(int, int);
must BinaryOp\s+pick\s*\(\s*char :: Write BinaryOp pick(char symbol).
```
:::

:::exercise Count with a predicate {medium}
Write `int countIf(const int* arr, int size, bool (*pred)(int))` that returns how many elements make
`pred` return `true`. Also write three predicates: `isEven`, `isPositive`, and `isSmall`
(true when `-10 <= x <= 10`).

`main` reads `n`, the `n` values, and the name of the predicate to use.

**Input:** `n` (0 to 100), then `n` integers, then one of `even`, `positive`, `small`.
**Output:** the count, followed by a newline.

```cpp starter
#include <iostream>
#include <string>

bool isEven(int x) { return x % 2 == 0; }

int main() {
    int n;
    std::cin >> n;
    int values[100]{};
    for (int i = 0; i < n; ++i) std::cin >> values[i];
    std::string name;
    std::cin >> name;

    std::cout << 0 << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

bool isEven(int x) { return x % 2 == 0; }
bool isPositive(int x) { return x > 0; }
bool isSmall(int x) { return x >= -10 && x <= 10; }

int countIf(const int* arr, int size, bool (*pred)(int)) {
    int count = 0;
    for (int i = 0; i < size; ++i) {
        if (pred(arr[i])) ++count;
    }
    return count;
}

int main() {
    int n;
    std::cin >> n;
    int values[100]{};
    for (int i = 0; i < n; ++i) std::cin >> values[i];
    std::string name;
    std::cin >> name;

    bool (*pred)(int) = isEven;
    if (name == "positive") pred = isPositive;
    else if (name == "small") pred = isSmall;

    std::cout << countIf(values, n, pred) << '\n';
}
```

```hint
Inside `countIf`, call the callback like a normal function: `if (pred(arr[i])) ++count;`.
```

```hint
In `main`, choose the function once: `bool (*pred)(int) = isEven;` then re-assign it based on the name.
```

```stdin
6
1 2 3 4 5 6
even
```

```expected
3
```

```stdin
5
-20 -5 0 5 20
small
```

```expected
3
```

```stdin
5
-20 -5 0 5 20
positive
```

```expected hidden
2
```

```stdin
0
even
```

```expected hidden
0
```

```stdin
6
-11 -10 10 11 0 3
small
```

```expected hidden
4
```

```stdin
5
0 -1 -2 3 -3
even
```

```expected hidden
2
```

```checks
must countIf\s*\([^)]*\(\s*\*\s*\w*\s*\)\s*\(\s*int\s*\) :: countIf must take a function pointer parameter like bool (*pred)(int).
must isPositive :: Write the isPositive predicate.
must isSmall :: Write the isSmall predicate.
```
:::

:::exercise Sort with a comparator {hard}
`std::sort` can sort in any order because you pass it a function that decides which of two elements
comes first. Build the same thing yourself. Write

```cpp
void sortBy(int* arr, int size, bool (*before)(int, int));
```

which sorts the array so that `before(a, b)` is `true` exactly when `a` must come before `b`. Use
**insertion sort**: take each element in turn and shift the elements in front of it one place to the
right while the new element must come before them, then drop it into the gap.

Then write four comparators and pick one with a function pointer:

| Mode | Order |
| --- | --- |
| `ascending` | smallest first |
| `descending` | largest first |
| `abs` | smallest absolute value first; for equal absolute values, the negative one first (`-3` before `3`) |
| `evens` | all even numbers before all odd numbers; ascending within each group |

**Input:** `n` (0 to 100), then `n` integers (between -10^9 and 10^9), then the mode.
**Output:** the sorted values separated by single spaces, followed by a newline (an empty line if `n` is 0).

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>

bool ascending(int a, int b) { return a < b; }
bool descending(int a, int b) { return a > b; }

bool byAbs(int a, int b) {
    int absA = a < 0 ? -a : a;
    int absB = b < 0 ? -b : b;
    if (absA != absB) {
        return absA < absB;
    }
    return a < b;                     // same size: the negative one first
}

bool evensFirst(int a, int b) {
    bool evenA = a % 2 == 0;          // works for negatives too: -3 % 2 is -1
    bool evenB = b % 2 == 0;
    if (evenA != evenB) {
        return evenA;                 // the even one comes first
    }
    return a < b;
}

void sortBy(int* arr, int size, bool (*before)(int, int)) {
    for (int i = 1; i < size; ++i) {
        int value = arr[i];
        int j = i - 1;
        while (j >= 0 && before(value, arr[j])) {
            arr[j + 1] = arr[j];      // shift right to make room
            --j;
        }
        arr[j + 1] = value;
    }
}

int main() {
    int n;
    std::cin >> n;
    int values[100]{};
    for (int i = 0; i < n; ++i) {
        std::cin >> values[i];
    }
    std::string mode;
    std::cin >> mode;

    bool (*before)(int, int) = ascending;
    if (mode == "descending") before = descending;
    else if (mode == "abs") before = byAbs;
    else if (mode == "evens") before = evensFirst;

    sortBy(values, n, before);
    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << values[i];
    }
    std::cout << '\n';
}
```

```hint
Insertion sort: for `i` from 1, save `value = arr[i]`, then walk `j` down from `i - 1` while `j >= 0`
and `before(value, arr[j])`, copying `arr[j]` to `arr[j + 1]`. Finally `arr[j + 1] = value;`.
```

```hint
A comparator must be **strict**: `before(x, x)` has to be `false`. Write each one as "decide by the main
rule if it differs, otherwise fall back to the tie-breaker".
```

```hint
Test for even with `x % 2 == 0`, not for odd with `x % 2 == 1`: in C++, `-3 % 2` is `-1`.
```

```stdin
6
5 -2 9 0 -7 3
ascending
```

```expected
-7 -2 0 3 5 9
```

```stdin
5
3 -3 1 -2 2
abs
```

```expected
1 -2 2 -3 3
```

```stdin
7
4 -3 7 -8 0 5 2
evens
```

```expected hidden
-8 0 2 4 -3 5 7
```

```stdin
6
1 3 3 -1 2 1
descending
```

```expected hidden
3 3 2 1 1 -1
```

```stdin
0
ascending
```

```expected hidden
```

```stdin
1
-5
abs
```

```expected hidden
-5
```

```stdin
5
-1000000000 1000000000 0 -1 1
abs
```

```expected hidden
0 -1 1 -1000000000 1000000000
```

```checks
must void\s+sortBy\s*\(\s*int\s*\*\s*\w+\s*,\s*int\s+\w+\s*,\s*bool\s*\(\s*\*\s*\w+\s*\)\s*\(\s*int\s*,\s*int\s*\)\s*\) :: Write void sortBy(int* arr, int size, bool (*before)(int, int)).
mustnot std::sort|std::stable_sort|qsort :: Write the sorting loop yourself.
```
:::
