---
title: References
summary: References as aliases, why they must be initialized and can't be reseated, const references and temporaries, dangling references, and references vs pointers.
---

You've already used references to pass arguments to functions without copying them. This lesson
looks at what a reference really is, compares it to a pointer, and covers the rules and traps.

## A reference is another name for an existing object

A **reference** is an **alias**: a second name for a variable that already exists. It is declared with
`&` after the type:

```cpp run
#include <iostream>

int main() {
    int score = 10;
    int& ref = score;      // ref is another name for score

    ref = 25;              // changes score
    std::cout << score << '\n';

    score += 5;            // ref sees the change: it IS score
    std::cout << ref << '\n';

    std::cout << (&ref == &score) << '\n';   // same address: same object
}
```

```output
25
30
1
```

There's no separate "reference object" you can inspect: everything you do to `ref` is done to `score`.
No `*` is needed to get at the value, which is why references are usually nicer than pointers.

As with pointers, the spacing is flexible: `int& r`, `int &r`, and `int & r` are the same, and in
`int& a = x, b = y;` only `a` is a reference.

## Rule 1: a reference must be initialized

A reference has to refer to something from the moment it's created:

```cpp compile-error
int main() {
    int& r;   // error: 'r' declared as reference but not initialized
}
```

This is a big advantage over pointers: **there's no such thing as a null reference** (in a correct
program). A function taking `int&` doesn't need to check for null.

## Rule 2: a reference can't be reseated

Once bound, a reference refers to the same object for its whole life. Assigning to it assigns **to
the object**, it does *not* make the reference refer to something else:

```cpp run
#include <iostream>

int main() {
    int a = 1;
    int b = 2;
    int& r = a;

    r = b;          // NOT "r now refers to b". This means a = b.
    b = 99;

    std::cout << a << ' ' << b << ' ' << r << '\n';
}
```

```output
2 99 2
```

If you need something that can be re-pointed, you need a pointer (or `std::reference_wrapper`, later).

## Rule 3: the type must match

A non-const reference can only bind to an **lvalue** (a named object you could take the address of)
of the right type. It can't bind to a literal or to a temporary result:

```cpp compile-error
int main() {
    int& a = 5;          // error: cannot bind non-const lvalue reference to an rvalue
}
```

```cpp compile-error
int main() {
    int x = 3;
    int& b = x + 1;      // error: x + 1 is a temporary
}
```

```cpp compile-error
int main() {
    double d = 2.5;
    int& c = d;          // error: an int& can't refer to a double
}
```

Why? If `int& a = 5;` were allowed, `a = 6;` would try to change the literal 5.

## const references

A **reference to const** (`const int&`) is a read-only alias. You can read through it but not write:

```cpp compile-error
int main() {
    int x = 3;
    const int& r = x;
    r = 4;   // error: assignment of read-only reference 'r'
}
```

And const references have a special power: they **can bind to temporaries**. The temporary's lifetime
is extended to match the reference:

```cpp run
#include <iostream>
#include <string>

int main() {
    const int& five = 5;               // OK: binds to a temporary int holding 5
    const int& sum = five + 10;        // OK
    double d = 2.9;
    const int& truncated = d;          // OK: a temporary int (2) is created and bound

    const std::string& greeting = "hello";   // a temporary std::string is created

    std::cout << five << ' ' << sum << ' ' << truncated << ' ' << greeting << '\n';
    d = 7.5;
    std::cout << truncated << '\n';    // still 2: it refers to the temporary, not to d
}
```

```output
5 15 2 hello
2
```

This is exactly why `const std::string&` parameters accept string literals, and why "pass by const
reference" is the default for read-only parameters of non-trivial types:

```cpp
void print(const std::string& s);   // accepts std::string variables AND "literals"
void edit(std::string& s);          // accepts only modifiable std::string variables
```

## References in range-for loops

The loop variable in a range-for is a fresh variable for each element. By default it's a **copy**:

```cpp run
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};

    for (int x : v) x *= 10;          // modifies copies: v unchanged
    std::cout << v[0] << ' ' << v[1] << ' ' << v[2] << '\n';

    for (int& x : v) x *= 10;         // x refers to each element: v changes
    std::cout << v[0] << ' ' << v[1] << ' ' << v[2] << '\n';

    for (auto& x : v) x += 1;         // same, letting the compiler deduce the type
    std::cout << v[0] << ' ' << v[1] << ' ' << v[2] << '\n';

    std::vector<std::string> names{"Ada", "Linus", "Grace"};
    for (const auto& name : names) {  // read-only and no copying of strings
        std::cout << name << ' ';
    }
    std::cout << '\n';
}
```

```output
1 2 3
10 20 30
11 21 31
Ada Linus Grace
```

The rule of thumb:

| Loop variable | Use when |
| --- | --- |
| `auto x` | elements are cheap to copy (`int`, `double`, `char`) and you only read them |
| `auto& x` | you want to **modify** the elements |
| `const auto& x` | elements are expensive to copy (`std::string`, structs, vectors) and you only read |

Other places `auto` meets references: plain `auto` **drops** references, so `auto copy = ref;` makes a
copy. Write `auto& alias = ref;` to keep the alias.

## Dangling references

A reference doesn't keep its object alive (except the temporary-binding case above). If the object
dies first, the reference **dangles**, and using it is undefined behavior, exactly like a dangling pointer.
The classic way to create one is returning a reference to a local variable:

```cpp
int& broken() {
    int local = 42;
    return local;    // warning: reference to local variable 'local' returned
}                    // local is destroyed here; the caller gets a dangling reference
```

GCC warns about that one. A sneakier version is holding a reference into a container that then
reallocates:

```cpp
std::vector<int> v{1, 2, 3};
int& first = v[0];
v.push_back(4);      // may move all elements to a bigger buffer...
first = 10;          // ...so first may dangle: undefined behavior
```

Returning a reference is fine when the object outlives the call: for example, a reference to an
element of a container the caller passed in, or to a global.

```cpp run
#include <iostream>
#include <vector>

int& largest(std::vector<int>& v) {   // v belongs to the caller, so this is safe
    std::size_t best = 0;
    for (std::size_t i = 1; i < v.size(); ++i) {
        if (v[i] > v[best]) best = i;
    }
    return v[best];
}

int main() {
    std::vector<int> v{4, 9, 2};
    largest(v) = 0;        // a returned reference can be assigned to!
    std::cout << v[0] << ' ' << v[1] << ' ' << v[2] << '\n';
}
```

```output
4 0 2
```

## References vs pointers

Under the hood, a compiler usually implements a reference as a pointer. The difference is in the
rules and the syntax:

| | Reference `int& r` | Pointer `int* p` |
| --- | --- | --- |
| Must be initialized | yes | no (but should be) |
| Can be null | no | yes (`nullptr`) |
| Can be re-pointed (reseated) | no | yes |
| Access the value | just `r` | `*p` |
| Get the address | `&r` (address of the referent) | `p` |
| Pointer arithmetic | no | yes (`p + 1`) |
| Can have a reference/pointer to it | no references to references | pointers to pointers (`int**`) |
| Arrays of them | no (`int& arr[3]` is illegal) | yes |
| Typical use | function parameters, aliases, range-for | optional things (may be null), re-pointable links, arrays, C APIs |

**Guideline:** use a reference when something **must exist** and will **always be the same object**.
Use a pointer when it **might be absent** (null) or needs to be **re-pointed**. Prefer references
for function parameters.

:::quiz
What does this print?

```cpp
int a = 5;
int b = 8;
int& r = a;
r = b;
r += 1;
std::cout << a << ' ' << b;
```

- [ ] `5 9`
- [ ] `5 8`
- [x] `9 8`
- [ ] `8 9`

`r = b` copies 8 into `a` (references can't be reseated). Then `r += 1` makes `a` 9. `b` is never touched.
:::

:::quiz
Which of these compile? (select all that apply)

- [ ] `int& r = 10;`
- [x] `const int& r = 10;`
- [x] `int x = 1; int& r = x;`
- [ ] `int& r;`

A non-const reference can't bind to a temporary like `10`, and every reference must be initialized.
A `const int&` can bind to a temporary.
:::

:::quiz
You want to read every `std::string` in a vector without copying them. Which loop is best?

- [ ] `for (auto s : names)`
- [ ] `for (auto& s : names)`
- [x] `for (const auto& s : names)`
- [ ] `for (auto* s : names)`

`const auto&` avoids copies and prevents accidental modification. `auto&` also avoids copies but
allows writes, and `auto` copies each string.
:::

:::exercise Alias it {easy}
Read an integer `x`. Create a reference `r` that refers to `x`. Using **only `r`**, add 10 to the value
and then double it. Print `x` and `r`.

**Input:** one integer.
**Output:** `x=<x> r=<r>`, followed by a newline. Example: `5` prints `x=30 r=30`.

```cpp starter
#include <iostream>

int main() {
    int x;
    std::cin >> x;

    // create a reference r to x and modify x through it

    std::cout << "x=" << x << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x;
    std::cin >> x;

    int& r = x;
    r += 10;
    r *= 2;

    std::cout << "x=" << x << " r=" << r << '\n';
}
```

```hint
`int& r = x;` makes `r` another name for `x`. Then `r += 10;` changes `x`.
```

```stdin
5
```

```expected
x=30 r=30
```

```stdin
-10
```

```expected
x=0 r=0
```

```stdin
100
```

```expected hidden
x=220 r=220
```

```checks
must int\s*&\s*r\s*=\s*x :: Declare the reference with int& r = x;
must \br\s*\+= :: Add 10 through the reference (r += 10).
```
:::

:::exercise Clamp every element {easy}
Read `n` and then `n` integers into a `std::vector<int>`, then two bounds `lo` and `hi`. Use a
range-for loop **with a reference** to clamp every element in place: values below `lo` become `lo`,
values above `hi` become `hi`. Then print the vector with another range-for that uses a `const`
reference.

**Input:** `n`, then `n` integers, then `lo hi` (with `lo <= hi`).
**Output:** the clamped values separated by single spaces, followed by a newline.

```cpp starter
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int lo, hi;
    std::cin >> lo >> hi;

    for (int x : v) {
        if (x < lo) x = lo;
        if (x > hi) x = hi;
    }

    bool first = true;
    for (int x : v) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int lo, hi;
    std::cin >> lo >> hi;

    for (auto& x : v) {
        if (x < lo) x = lo;
        if (x > hi) x = hi;
    }

    bool first = true;
    for (const auto& x : v) {
        if (!first) std::cout << ' ';
        std::cout << x;
        first = false;
    }
    std::cout << '\n';
}
```

```hint
The starter's clamping loop works on copies. Change `int x` to `int& x` (or `auto& x`) so it changes
the elements themselves.
```

```stdin
5
-3 4 12 7 0
0 10
```

```expected
0 4 10 7 0
```

```stdin
3
1 2 3
2 2
```

```expected
2 2 2
```

```stdin
4
100 -100 50 -50
-60 60
```

```expected hidden
60 -60 50 -50
```

```stdin
0
0 10
```

```expected hidden

```

```checks
must for\s*\(\s*const\s+(auto|int)\s*& :: Print with a const reference loop variable (const auto& x).
```
:::

:::exercise Min and max out {medium}
Write a function `void minMax(const std::vector<int>& values, int& smallest, int& largest)` that
stores the smallest and largest element into the two reference parameters. The vector parameter is a
`const` reference because the function only reads it.

**Input:** `n` (at least 1), then `n` integers.
**Output:** `min=<smallest> max=<largest>`, followed by a newline.

```cpp starter
#include <iostream>
#include <vector>

void minMax(const std::vector<int>& values, int smallest, int largest) {
    smallest = values[0];
    largest = values[0];
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) std::cin >> v;

    int lo = 0;
    int hi = 0;
    minMax(values, lo, hi);
    std::cout << "min=" << lo << " max=" << hi << '\n';
}
```

```cpp solution
#include <iostream>
#include <vector>

void minMax(const std::vector<int>& values, int& smallest, int& largest) {
    smallest = values[0];
    largest = values[0];
    for (int v : values) {
        if (v < smallest) smallest = v;
        if (v > largest) largest = v;
    }
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) std::cin >> v;

    int lo = 0;
    int hi = 0;
    minMax(values, lo, hi);
    std::cout << "min=" << lo << " max=" << hi << '\n';
}
```

```hint
The starter's `smallest` and `largest` are copies, so `main` never sees the results. Make them `int&`.
```

```stdin
5
3 -1 8 8 2
```

```expected
min=-1 max=8
```

```stdin
1
7
```

```expected
min=7 max=7
```

```stdin
3
-5 -9 -2
```

```expected hidden
min=-9 max=-2
```

```stdin
4
5 6 7 -100
```

```expected hidden
min=-100 max=7
```

```checks
must minMax\s*\(\s*const\s+std::vector<int>\s*&\s*\w+\s*,\s*int\s*&\s*\w+\s*,\s*int\s*&\s*\w+\s*\) :: Use the signature minMax(const std::vector<int>& values, int& smallest, int& largest).
```
:::

:::exercise Shout it {easy}
Read a whole line of text and convert every lowercase letter to uppercase **in place**, using a
range-for loop over the `std::string` with a `char&` loop variable. Then print the line.

**Input:** one line of text (it may contain spaces and punctuation, or be empty).
**Output:** the same line with lowercase letters made uppercase, followed by a newline.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);

    // uppercase every letter in place

    std::cout << line << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);

    for (char& c : line) {
        if (c >= 'a' && c <= 'z') {
            c = static_cast<char>(c - 'a' + 'A');
        }
    }

    std::cout << line << '\n';
}
```

```hint
`for (char& c : line)` gives you a reference to each character. Assigning to `c` changes the string.
```

```hint
For a lowercase letter, `c - 'a' + 'A'` is its uppercase version. (`std::toupper` from `<cctype>`
also works.)
```

```stdin
hello, world!
```

```expected
HELLO, WORLD!
```

```stdin
C++ 20 Rocks
```

```expected
C++ 20 ROCKS
```

```stdin

```

```expected hidden

```

```stdin
a z A Z ` { @ [
```

```expected hidden
A Z A Z ` { @ [
```

```checks
must for\s*\(\s*(char|auto)\s*&\s*\w+\s*: :: Loop with a reference: for (char& c : line).
```
:::

:::exercise Bank transfers {hard}
Simulate a tiny bank. Accounts are numbered from 1 to `n` and start with the given balances. Then
process commands until the input ends:

| Command | Effect |
| --- | --- |
| `deposit A X` | add `X` to account `A` |
| `withdraw A X` | take `X` from account `A`, if its balance is at least `X` |
| `transfer A B X` | move `X` from account `A` to account `B`, if `A`'s balance is at least `X` |
| `show` | print all balances on one line, separated by single spaces |

If a command names an account that doesn't exist, print `no such account` and do nothing. If there
isn't enough money, print `insufficient funds` and do nothing. Successful commands print nothing.

Write the operations as functions that take the balances **by reference**:
`void deposit(long long& balance, long long amount)`, `bool withdraw(long long& balance, long long amount)`
and `bool transfer(long long& from, long long& to, long long amount)` (they return `false` when there
isn't enough money). Careful: a transfer from an account **to itself** is allowed, and must leave the
balance unchanged.

**Input:** `n` (1 to 100), then `n` balances, then the commands. Amounts are positive and at most
10^12; balances never exceed 10^15.
**Output:** one line for each `show` and for each failed command.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

void deposit(long long& balance, long long amount) {
    balance += amount;
}

bool withdraw(long long& balance, long long amount) {
    if (balance < amount) {
        return false;
    }
    balance -= amount;
    return true;
}

bool transfer(long long& from, long long& to, long long amount) {
    if (from < amount) {
        return false;
    }
    from -= amount;       // if from and to are the same account, these two lines cancel out
    to += amount;
    return true;
}

bool exists(const std::vector<long long>& accounts, int id) {
    return id >= 1 && id <= static_cast<int>(accounts.size());
}

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> accounts(n);
    for (long long& balance : accounts) {
        std::cin >> balance;
    }

    std::string command;
    while (std::cin >> command) {
        if (command == "show") {
            for (std::size_t i = 0; i < accounts.size(); ++i) {
                std::cout << accounts[i] << (i + 1 < accounts.size() ? " " : "\n");
            }
        } else if (command == "transfer") {
            int a, b;
            long long amount;
            std::cin >> a >> b >> amount;
            if (!exists(accounts, a) || !exists(accounts, b)) {
                std::cout << "no such account\n";
            } else if (!transfer(accounts[a - 1], accounts[b - 1], amount)) {
                std::cout << "insufficient funds\n";
            }
        } else {
            int a;
            long long amount;
            std::cin >> a >> amount;
            if (!exists(accounts, a)) {
                std::cout << "no such account\n";
                continue;
            }
            long long& balance = accounts[a - 1];   // an alias for the element, not a copy
            if (command == "deposit") {
                deposit(balance, amount);
            } else if (!withdraw(balance, amount)) {
                std::cout << "insufficient funds\n";
            }
        }
    }
}
```

```hint
Check that every account number is between 1 and `n` **before** touching any balance. Account `A` is
`accounts[A - 1]`; pass that element straight to the function, and the reference parameter makes the
function change the vector itself.
```

```hint
"At least `X`" means a balance exactly equal to `X` is enough.
```

```hint
In `transfer(accounts[a - 1], accounts[a - 1], x)`, `from` and `to` are two names for the **same**
`long long`. `from -= amount; to += amount;` handles that correctly. Computing both new balances first
and then assigning them would not: the second assignment would overwrite the first.
```

```stdin
3
100 50 0
deposit 3 25
withdraw 2 60
transfer 1 2 30
show
```

```expected
insufficient funds
70 80 25
```

```stdin
2
10 20
transfer 2 1 20
transfer 2 1 1
withdraw 1 30
show
```

```expected
insufficient funds
0 0
```

```stdin
2
5 5
deposit 0 10
withdraw 3 1
transfer 1 -1 1
transfer 9 1 100
show
```

```expected hidden
no such account
no such account
no such account
no such account
5 5
```

```stdin
1
100
transfer 1 1 60
show
transfer 1 1 101
show
```

```expected hidden
100
insufficient funds
100
```

```stdin
2
1000000000000 0
transfer 1 2 999999999999
deposit 2 1000000000000
show
```

```expected hidden
1 1999999999999
```

```checks
must bool\s+transfer\s*\(\s*long\s+long\s*&\s*\w+\s*,\s*long\s+long\s*&\s*\w+\s*,\s*long\s+long :: Write bool transfer(long long& from, long long& to, long long amount).
must bool\s+withdraw\s*\(\s*long\s+long\s*& :: Write bool withdraw(long long& balance, long long amount).
must void\s+deposit\s*\(\s*long\s+long\s*& :: Write void deposit(long long& balance, long long amount).
```
:::
