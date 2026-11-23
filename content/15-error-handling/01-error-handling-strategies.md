---
title: Error Handling Strategies
summary: What can go wrong, and the tools C++ gives you to report it. Return codes, sentinel values, out-parameters, std::optional, std::expected, assertions, and exceptions, and when to use which.
---

## Things go wrong

Real programs deal with failure all the time: the user types `abc` where a number was expected, a
file doesn't exist, the network drops, a function is called with arguments that make no sense. Good
code decides **who notices** the problem, **how it's reported**, and **who handles it**.

It helps to sort errors into three kinds:

| Kind | Examples | Usual response |
| --- | --- | --- |
| **Expected failures** | bad user input, missing file, key not found, "no result" | Report it to the caller, who handles it as a normal case. |
| **Exceptional conditions** | out of memory, disk full, corrupted data, server gone | Report it to some caller far up the call chain that can recover (or give up cleanly). |
| **Programmer bugs** | index out of range, null pointer passed where forbidden, broken invariant | Catch it as early as possible during development (assertions) and fix the code. |

C++ offers a tool for each. Let's look at them one by one, all solving the same problem: dividing
two integers, where dividing by zero is a failure.

## 1. Return codes

The function returns a **status** that says whether it worked, and gives the real result some other
way (or there is no result). This is the classic C style (`main` returning `0` for success is one).
An `enum class` makes the codes readable:

```cpp run
#include <iostream>

enum class Status { Ok, DivisionByZero, Overflow };

Status divide(int a, int b, int& result) {
    if (b == 0) return Status::DivisionByZero;
    if (a == -2147483647 - 1 && b == -1) return Status::Overflow;   // INT_MIN / -1 doesn't fit
    result = a / b;
    return Status::Ok;
}

int main() {
    int r = 0;
    if (divide(10, 3, r) == Status::Ok) std::cout << "10 / 3 = " << r << '\n';

    Status s = divide(1, 0, r);
    if (s == Status::DivisionByZero) std::cout << "cannot divide by zero\n";
}
```

```output
10 / 3 = 3
cannot divide by zero
```

- **Pros:** explicit, cheap, and the possible failures are visible in the type.
- **Cons:** the caller can simply **ignore** the code. Results need a separate channel. Every caller in
  a long call chain must check and pass the code along by hand.

### `[[nodiscard]]`: don't let callers ignore it

Marking a function (or a whole type) `[[nodiscard]]` makes the compiler warn when its return value
is thrown away:

```cpp run warns
#include <iostream>

[[nodiscard]] bool save_file() {
    return false;   // pretend it failed
}

int main() {
    save_file();    // warning: ignoring return value of 'bool save_file()', declared with attribute 'nodiscard'
    std::cout << "Did it work? Nobody checked.\n";
}
```

You can add a reason: `[[nodiscard("check whether saving worked")]]`.

## 2. Sentinel values

A **sentinel** is a special value of the normal return type that means "failed" or "not found":
`-1` for "no index", `std::string::npos` from `find`, `end()` from the algorithms, `nullptr` for
"no object".

```cpp run
#include <iostream>
#include <string>
#include <vector>

int index_of(const std::vector<int>& v, int target) {
    for (std::size_t i = 0; i < v.size(); ++i)
        if (v[i] == target) return static_cast<int>(i);
    return -1;   // sentinel: "not found"
}

int main() {
    std::vector<int> v{4, 8, 15};
    std::cout << index_of(v, 8) << ' ' << index_of(v, 99) << '\n';

    std::string s = "hello";
    if (s.find('z') == std::string::npos) std::cout << "no z\n";
}
```

```output
1 -1
no z
```

- **Pros:** simple, no extra types.
- **Cons:** only works when some value can **never** be a real answer. For "divide two ints", every
  `int` is a possible result, so there's no free value to use. And nothing forces the caller to check:
  using `-1` as an index is a classic bug.

## 3. `bool` + out-parameter

Return `true`/`false` for success, and write the result through a reference parameter. The standard
library uses this pattern in a few places, and `std::cin >> x` works similarly (the stream converts
to `false` on failure).

```cpp run
#include <iostream>

bool try_divide(int a, int b, int& out) {
    if (b == 0) return false;
    out = a / b;
    return true;
}

int main() {
    int q;
    if (try_divide(17, 5, q)) std::cout << "17 / 5 = " << q << '\n';
    if (!try_divide(17, 0, q)) std::cout << "failed\n";
}
```

```output
17 / 5 = 3
failed
```

- **Pros:** works for any result type, and the `if (try_x(...))` reads nicely.
- **Cons:** the caller must create a variable first; on failure that variable holds something
  meaningless that may be used by mistake. You can't tell *why* it failed.

## 4. `std::optional<T>`

`std::optional<T>` (from `<optional>`, C++17) holds **either a `T` or nothing** (`std::nullopt`).
It's the modern way to say "maybe there's a result" with the result and the success flag packed
together:

```cpp run
#include <iostream>
#include <optional>

std::optional<int> safe_divide(int a, int b) {
    if (b == 0) return std::nullopt;   // "no result"
    return a / b;                       // a value
}

int main() {
    if (auto r = safe_divide(20, 4)) {          // converts to true if it has a value
        std::cout << "result: " << *r << '\n';   // * accesses the value
    }

    auto bad = safe_divide(1, 0);
    std::cout << std::boolalpha << bad.has_value() << '\n';
    std::cout << bad.value_or(-1) << '\n';      // fallback when empty
}
```

```output
result: 5
false
-1
```

- **Pros:** the type says "this can fail"; the value can't be used by accident without unwrapping.
- **Cons:** says **nothing about why** it failed. Fine for "not found", too thin for "file locked vs
  file missing vs permission denied".

## 5. `std::expected<T, E>` (C++23)

C++23 adds `std::expected<T, E>` (in `<expected>`): **either** a value of type `T` **or** an error of
type `E`. It's like `optional` with a reason attached:

```cpp
// C++23 only: shown for reference, not used in this course's exercises
#include <expected>
#include <string>

std::expected<int, std::string> divide(int a, int b) {
    if (b == 0) return std::unexpected("division by zero");
    return a / b;
}

// auto r = divide(1, 0);
// if (r) use(*r); else std::cout << r.error();
```

Until you can use C++23, the same idea can be built from `std::variant<T, Error>`, or a small struct.

## 6. Assertions

For **programmer bugs**, the ones that should never happen in a correct program, use `assert` (from
`<cassert>`). It checks a condition while you develop and stops the program immediately with a
message pointing at the failed line. It's switched off in release builds. You'll see it in detail
at the end of this module.

```cpp
#include <cassert>

int average(const std::vector<int>& v) {
    assert(!v.empty() && "average() needs at least one value");   // caller's bug if this fails
    ...
}
```

## 7. Exceptions

An **exception** reports an error by **throwing** an object. The function stops right there, and
control jumps out through as many callers as needed until it reaches a `catch` block that handles
that type of error. Callers in between don't have to write any error-checking code:

```cpp run
#include <iostream>
#include <stdexcept>

int divide(int a, int b) {
    if (b == 0) throw std::invalid_argument("division by zero");
    return a / b;
}

int compute(int a, int b) {
    return divide(a, b) * 2;   // no error handling needed here: an exception passes straight through
}

int main() {
    try {
        std::cout << compute(10, 2) << '\n';
        std::cout << compute(1, 0) << '\n';      // throws; this line never prints
    } catch (const std::invalid_argument& e) {
        std::cout << "error: " << e.what() << '\n';
    }
}
```

```output
10
error: division by zero
```

- **Pros:** can't be silently ignored (an unhandled exception ends the program); keeps the normal
  code path clean; works where there's no return value at all (constructors, operators); carries a
  rich error object.
- **Cons:** the control flow is invisible at the call site; throwing is slow compared to returning
  (fine for rare errors, bad for things that fail constantly); code must be written to be
  **exception-safe** (later lessons).

The next lessons cover exceptions in depth.

## When to use what

| Situation | Good choice |
| --- | --- |
| "Not found" / "no result" is a normal outcome | `std::optional`, or a sentinel like `end()` / `npos` |
| Failure is normal **and** the caller needs to know why | an error code (`enum class`), `std::expected` (C++23) |
| Failure is rare, and the code that can handle it is far away | exceptions |
| A constructor can't create a valid object | exceptions (constructors have no return value) |
| A precondition is violated: a bug in the calling code | `assert` (and fix the bug) |
| Very hot code, or a project that disables exceptions (some games, embedded) | error codes / `optional` |

Whatever you choose, be **consistent** within a piece of code, and never fail **silently**:
returning a wrong-but-plausible value is the worst option of all.

:::quiz
A function `find_user(name)` searches a list and may legitimately find nobody. Which return type
fits best?

- [ ] `void`, and print a message if nobody is found
- [x] `std::optional<User>`
- [ ] `User`, and call `std::exit(1)` if nobody is found
- [ ] `User`, and return a default-constructed `User` when nobody is found

"Not found" is a normal outcome, so the type should say "maybe a User". A default `User` is a plausible-looking wrong value that callers can't tell apart from a real one.
:::

:::quiz
Which statements about `[[nodiscard]]` are true? (select all that apply)

- [x] It makes the compiler warn when the return value is ignored
- [ ] It makes the program throw an exception when the value is ignored
- [x] It's useful on functions that return error codes
- [ ] It stops the function from returning a value

It's purely a compile-time hint: ignoring the result is still legal, but you get a warning.
:::

:::exercise Safe division {easy}
Write `std::optional<long long> safe_divide(long long a, long long b)` that returns `std::nullopt` when
`b` is `0`, and `a / b` otherwise. Use it on every pair read from input.

**Input:** any number of lines `a b`.
**Output:** for each line, the quotient, or `error` if `b` is `0`.

```cpp starter
#include <iostream>
#include <optional>

long long safe_divide(long long a, long long b) {
    return a / (b == 0 ? 1 : b);
}

int main() {
    long long a, b;
    while (std::cin >> a >> b) {
        std::cout << safe_divide(a, b) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <optional>

std::optional<long long> safe_divide(long long a, long long b) {
    if (b == 0) return std::nullopt;
    return a / b;
}

int main() {
    long long a, b;
    while (std::cin >> a >> b) {
        if (auto r = safe_divide(a, b)) {
            std::cout << *r << '\n';
        } else {
            std::cout << "error\n";
        }
    }
}
```

```hint
Change the return type to `std::optional<long long>` and `return std::nullopt;` for the bad case.
```

```hint
In `main`, `if (auto r = safe_divide(a, b))` is true only when there's a value; print `*r`.
```

```stdin
10 2
7 0
-9 4
```

```expected
5
error
-2
```

```stdin
0 0
0 5
```

```expected hidden
error
0
```

```stdin
-7 2
7 -2
-8 0
9223372036854775807 1
```

```expected hidden
-3
-3
error
9223372036854775807
```

```checks
must std::optional\s*<\s*long\s+long\s*>\s*safe_divide :: safe_divide must return std::optional<long long>.
must nullopt :: Return std::nullopt for the failure case.
```
:::

:::exercise Parse an age {medium}
Write `bool parse_age(const std::string& text, int& age)`. It succeeds (returns `true` and stores the
value in `age`) only if `text` is **all digits** (at least one) and the number is between `0` and
`150`. Otherwise it returns `false` and leaves `age` alone.

Read tokens until the end of input and report on each.

**Input:** whitespace-separated tokens.
**Output:** for each token, `age N` if it's valid, otherwise `invalid: TOKEN`.

```cpp starter
#include <iostream>
#include <string>

bool parse_age(const std::string& text, int& age) {
    age = std::stoi(text);
    return true;
}

int main() {
    std::string token;
    while (std::cin >> token) {
        int age = 0;
        parse_age(token, age);
        std::cout << "age " << age << '\n';
    }
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <string>

bool parse_age(const std::string& text, int& age) {
    if (text.empty()) return false;
    int value = 0;
    for (char c : text) {
        if (!std::isdigit(static_cast<unsigned char>(c))) return false;
        value = value * 10 + (c - '0');
        if (value > 150) return false;   // too big already: also keeps value from overflowing
    }
    age = value;
    return true;
}

int main() {
    std::string token;
    while (std::cin >> token) {
        int age = 0;
        if (parse_age(token, age)) {
            std::cout << "age " << age << '\n';
        } else {
            std::cout << "invalid: " << token << '\n';
        }
    }
}
```

```hint
Loop over the characters and reject the token as soon as one isn't a digit
(`std::isdigit(static_cast<unsigned char>(c))`). Build the number as you go: `value = value * 10 + (c - '0')`.
```

```hint
Long tokens like `99999999999` would overflow an `int`. Since anything above `150` is invalid anyway,
stop as soon as the value passes `150`. (Don't reject tokens just for being longer than 3 characters:
`0042` is all digits and its value is `42`.)
```

```stdin
42 abc 7 150 151
```

```expected
age 42
invalid: abc
age 7
age 150
invalid: 151
```

```stdin
0 -5 12x 007 99999999999
```

```expected hidden
age 0
invalid: -5
invalid: 12x
age 7
invalid: 99999999999
```

```stdin
0150 +5 1000 000000000000000000042 15o 1 5 0
```

```expected hidden
age 150
invalid: +5
invalid: 1000
age 42
invalid: 15o
age 1
age 5
age 0
```

```checks
must bool\s+parse_age\s*\(\s*const\s+std::string\s*&\s*\w+\s*,\s*int\s*&\s*\w+\s*\) :: Keep the signature bool parse_age(const std::string& text, int& age).
must if\s*\(\s*parse_age :: Check the result of parse_age with if.
```
:::

:::exercise Status codes {easy}
Model a bank account with an error-code API. Write

```cpp
enum class Status { Ok, InvalidAmount, InsufficientFunds };
Status withdraw(long long& balance, long long amount);
```

`withdraw` returns `InvalidAmount` if `amount <= 0`, `InsufficientFunds` if `amount > balance`, and
otherwise subtracts the amount and returns `Ok`. A failed withdrawal leaves the balance unchanged.

**Input:** the starting balance, then any number of withdrawal amounts.
**Output:** for each amount, one line: `ok, balance B`, `invalid amount`, or `insufficient funds`.

```cpp starter
#include <iostream>

enum class Status { Ok, InvalidAmount, InsufficientFunds };

Status withdraw(long long& balance, long long amount) {
    balance -= amount;
    return Status::Ok;
}

int main() {
    long long balance, amount;
    std::cin >> balance;
    while (std::cin >> amount) {
        withdraw(balance, amount);
        std::cout << "ok, balance " << balance << '\n';
    }
}
```

```cpp solution
#include <iostream>

enum class Status { Ok, InvalidAmount, InsufficientFunds };

Status withdraw(long long& balance, long long amount) {
    if (amount <= 0) return Status::InvalidAmount;
    if (amount > balance) return Status::InsufficientFunds;
    balance -= amount;
    return Status::Ok;
}

int main() {
    long long balance, amount;
    std::cin >> balance;
    while (std::cin >> amount) {
        switch (withdraw(balance, amount)) {
            case Status::Ok:
                std::cout << "ok, balance " << balance << '\n';
                break;
            case Status::InvalidAmount:
                std::cout << "invalid amount\n";
                break;
            case Status::InsufficientFunds:
                std::cout << "insufficient funds\n";
                break;
        }
    }
}
```

```hint
Check the error conditions **before** changing `balance`, and return early.
```

```hint
In `main`, a `switch` on the returned `Status` handles each case cleanly.
```

```stdin
100
30 80 0 70
```

```expected
ok, balance 70
insufficient funds
invalid amount
ok, balance 0
```

```stdin
5
-1 6 5 1
```

```expected hidden
invalid amount
insufficient funds
ok, balance 0
insufficient funds
```

```stdin
0
1 0 -1000000000000
```

```expected hidden
insufficient funds
invalid amount
invalid amount
```

```checks
must Status::InvalidAmount :: Return Status::InvalidAmount for bad amounts.
must Status::InsufficientFunds :: Return Status::InsufficientFunds when the balance is too low.
mustnot \bthrow\b :: Use status codes in this exercise, not exceptions.
```
:::
