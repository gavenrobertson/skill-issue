---
title: Custom Exceptions
summary: Defining your own exception types. Deriving from std::runtime_error, overriding what() with noexcept, carrying extra data, and designing an exception hierarchy for a program.
---

## Why define your own?

Throwing `std::runtime_error("parse failed")` works, but the handler can only read a string. Your own
exception **types** let callers:

- **Catch selectively**: handle a `ParseError` here, let a `NetworkError` go up to someone else.
- **Get structured data**: the line number, the bad value, the account ID, as real typed members
  instead of digits buried in a message.

Always derive (directly or indirectly) from **`std::exception`**, so code that catches
`const std::exception&` still catches yours.

## The simplest custom exception

Derive from `std::runtime_error` (or `std::logic_error`, or another standard type that fits) and
**inherit its constructors** with a using-declaration. That's all:

```cpp run
#include <iostream>
#include <stdexcept>

class ConfigError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;   // inherit the (const std::string&) and (const char*) constructors
};

void load_config(bool exists) {
    if (!exists) throw ConfigError("config.ini not found");
}

int main() {
    try {
        load_config(false);
    } catch (const ConfigError& e) {               // catch by our own type...
        std::cout << "config problem: " << e.what() << '\n';
    }

    try {
        load_config(false);
    } catch (const std::exception& e) {            // ...or by any of its bases
        std::cout << "generic handler: " << e.what() << '\n';
    }
}
```

```output
config problem: config.ini not found
generic handler: config.ini not found
```

Use **`public`** inheritance. With `private` (the default for `class`!) or `protected` inheritance,
a `catch (const std::exception&)` handler does **not** match, because the base class is inaccessible.

You can also write the constructor out yourself and pass the message to the base:

```cpp
class ConfigError : public std::runtime_error {
public:
    explicit ConfigError(const std::string& msg) : std::runtime_error(msg) {}
};
```

## Adding data members

Store extra information as members, set them in the constructor, and provide accessors. Build the
human-readable message **once**, in the constructor, and hand it to the base class:

```cpp run
#include <iostream>
#include <stdexcept>
#include <string>

class ParseError : public std::runtime_error {
public:
    ParseError(int line, const std::string& problem)
        : std::runtime_error("line " + std::to_string(line) + ": " + problem),
          line_(line) {}

    int line() const noexcept { return line_; }

private:
    int line_;
};

int parse_value(int line, const std::string& text) {
    if (text.empty()) throw ParseError(line, "empty value");
    return std::stoi(text);
}

int main() {
    try {
        parse_value(1, "5");
        parse_value(2, "");
    } catch (const ParseError& e) {
        std::cout << e.what() << '\n';
        std::cout << "jump to line " << e.line() << '\n';
    }
}
```

```output
line 2: empty value
jump to line 2
```

> **Tip:** Keep exception members cheap and safe to copy: `int`s, enums, and at most a few strings.
> An exception object may be copied while it's being thrown, and if copying it throws
> another exception, the program is terminated.

## Deriving from `std::exception` and overriding `what()`

If no standard class fits, derive from `std::exception` directly and **override `what()`**. Its exact
signature matters:

```cpp
const char* what() const noexcept override;
```

- `const`: callable on a `const` reference, which is how you catch.
- `noexcept`: `what()` must never throw (the base declares it `noexcept`, and an override can't be
  less strict).
- `override`: asks the compiler to check that you really override the base function.

```cpp run
#include <exception>
#include <iostream>
#include <string>

class InsufficientFunds : public std::exception {
public:
    InsufficientFunds(long long balance, long long requested)
        : balance_(balance), requested_(requested),
          message_("insufficient funds: balance " + std::to_string(balance) +
                   ", requested " + std::to_string(requested)) {}

    const char* what() const noexcept override { return message_.c_str(); }

    long long shortfall() const noexcept { return requested_ - balance_; }

private:
    long long balance_;
    long long requested_;
    std::string message_;   // owns the text that what() points into
};

int main() {
    try {
        throw InsufficientFunds(50, 80);
    } catch (const InsufficientFunds& e) {
        std::cout << e.what() << '\n' << "short by " << e.shortfall() << '\n';
    }
}
```

```output
insufficient funds: balance 50, requested 80
short by 30
```

Forgetting `noexcept` (or `const`) is a compile error, because the override would be looser than
the base function:

```cpp compile-error
#include <exception>

class Bad : public std::exception {
public:
    const char* what() const override { return "bad"; }   // error: looser exception specifier
};

int main() { throw Bad(); }
```

### Pitfall: returning a pointer to a temporary

`what()` returns a raw `const char*`. If you build the string **inside** `what()`, the pointer
dangles as soon as `what()` returns:

```cpp
const char* what() const noexcept override {
    std::string msg = "error code " + std::to_string(code_);
    return msg.c_str();   // BUG: msg is destroyed at the end of what(); the caller reads freed memory
}
```

That's why the message is built **in the constructor** and stored in a member (or passed to a
`std::runtime_error` base, which stores it for you). Returning a string literal (`return "bad";`)
is fine: literals live for the whole program.

## Exception hierarchies

For a larger program, define one **base exception** for your code, and derive the specific errors
from it. Callers then choose how fine-grained to be:

```cpp run
#include <iostream>
#include <stdexcept>
#include <string>

// The base for everything our application throws
class AppError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class NetworkError : public AppError {
public:
    NetworkError(const std::string& host, int code)
        : AppError("cannot reach " + host + " (code " + std::to_string(code) + ")"), code_(code) {}
    int code() const noexcept { return code_; }

private:
    int code_;
};

class TimeoutError : public NetworkError {
public:
    explicit TimeoutError(const std::string& host) : NetworkError(host, 408) {}
};

class StorageError : public AppError {
public:
    using AppError::AppError;
};

void operation(int n) {
    if (n == 0) throw TimeoutError("api.example.com");
    if (n == 1) throw NetworkError("db.local", 503);
    if (n == 2) throw StorageError("disk full");
}

int main() {
    for (int n = 0; n < 3; ++n) {
        try {
            operation(n);
        } catch (const TimeoutError& e) {           // most specific first
            std::cout << "retry later: " << e.what() << '\n';
        } catch (const NetworkError& e) {
            std::cout << "network down, code " << e.code() << '\n';
        } catch (const AppError& e) {               // everything else of ours
            std::cout << "app error: " << e.what() << '\n';
        }
    }
}
```

```output
retry later: cannot reach api.example.com (code 408)
network down, code 503
app error: disk full
```

Guidelines for designing them:

- Create a new type only when some caller would **catch it differently**. Not every message needs
  its own class.
- Name them after **what went wrong** (`ParseError`, `TimeoutError`), not where (`ModuleXException`).
- Pick the right standard base: `std::logic_error` for "the caller broke the rules",
  `std::runtime_error` for "something in the outside world failed".
- Throw **by value**, catch **by `const` reference**: `throw ParseError(3, "x");`, never
  `throw new ParseError(...)` (that throws a *pointer*, which nobody catches as `ParseError&`, and
  which leaks).

:::quiz
Which declaration correctly overrides `what()` in a class derived from `std::exception`?

- [ ] `std::string what() const override;`
- [ ] `const char* what() override;`
- [x] `const char* what() const noexcept override;`
- [ ] `virtual char* what() noexcept;`

The return type must be `const char*`, and the function must be `const` and `noexcept` to match (and override) the base.
:::

:::quiz
`class MyError : std::runtime_error { ... };` (note: no `public`) is thrown. Which handler catches it?

```cpp
try { throw MyError("x"); }
catch (const std::exception&) { std::cout << "A"; }
catch (...) { std::cout << "B"; }
```

- [ ] `A`
- [x] `B`
- [ ] Neither, the program terminates
- [ ] Both

Inheritance in a `class` is **private** by default, so `std::exception` is an inaccessible base and the first handler doesn't match. Always write `public`.
:::

:::exercise Negative deposit
Define `class NegativeAmountError` that derives **publicly** from `std::runtime_error`. Write
`void deposit(long long& balance, long long amount)` that throws
`NegativeAmountError("negative amount: " + std::to_string(amount))` when `amount < 0`, and otherwise adds
it to the balance.

Starting from a balance of `0`, read amounts until the end of input. For each, print
`balance: B` on success, or `error: MESSAGE` (from `what()`) when a `NegativeAmountError` is caught.

**Input:** any number of integers.
**Output:** one line per amount.

```cpp starter
#include <iostream>
#include <stdexcept>
#include <string>

// define NegativeAmountError here

void deposit(long long& balance, long long amount) {
    balance += amount;
}

int main() {
    long long balance = 0, amount;
    while (std::cin >> amount) {
        deposit(balance, amount);
        std::cout << "balance: " << balance << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <string>

class NegativeAmountError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

void deposit(long long& balance, long long amount) {
    if (amount < 0) throw NegativeAmountError("negative amount: " + std::to_string(amount));
    balance += amount;
}

int main() {
    long long balance = 0, amount;
    while (std::cin >> amount) {
        try {
            deposit(balance, amount);
            std::cout << "balance: " << balance << '\n';
        } catch (const NegativeAmountError& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
}
```

```hint
`class NegativeAmountError : public std::runtime_error { public: using std::runtime_error::runtime_error; };`
```

```stdin
100
-5
20
```

```expected
balance: 100
error: negative amount: -5
balance: 120
```

```stdin
0
-1000000000000
```

```expected hidden
balance: 0
error: negative amount: -1000000000000
```

```checks
must class\s+NegativeAmountError\s*:\s*public\s+std::runtime_error :: NegativeAmountError must derive publicly from std::runtime_error.
must catch\s*\(\s*const\s+NegativeAmountError\s*& :: Catch NegativeAmountError by const reference.
```
:::

:::exercise Config parser
Parse lines of the form `key=value`. Define `class ParseError` deriving publicly from
`std::runtime_error` with a member function `int line() const` that returns the (1-based) line number
where the problem was found.

A line is invalid if it has **no `=`** (message `missing '='`) or an **empty key** (message
`empty key`). Write `std::pair<std::string, std::string> parse_line(const std::string& text, int line)`
that throws a `ParseError` for invalid lines.

For every line read, print `KEY -> VALUE` on success, or `line N: MESSAGE` for a `ParseError`,
where `N` comes from `line()`. At the end print `ok: C` with the number of valid lines.

**Input:** lines of text (read with `std::getline`); a line may be empty.
**Output:** one line per input line, then the `ok:` line.

```cpp starter
#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>

std::pair<std::string, std::string> parse_line(const std::string& text, int line) {
    auto eq = text.find('=');
    (void)line;
    return {text.substr(0, eq), text.substr(eq + 1)};
}

int main() {
    std::string text;
    int line = 0, ok = 0;
    while (std::getline(std::cin, text)) {
        ++line;
        auto [key, value] = parse_line(text, line);
        std::cout << key << " -> " << value << '\n';
        ++ok;
    }
    std::cout << "ok: " << ok << '\n';
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>

class ParseError : public std::runtime_error {
public:
    ParseError(int line, const std::string& message)
        : std::runtime_error(message), line_(line) {}

    int line() const { return line_; }

private:
    int line_;
};

std::pair<std::string, std::string> parse_line(const std::string& text, int line) {
    auto eq = text.find('=');
    if (eq == std::string::npos) throw ParseError(line, "missing '='");
    if (eq == 0) throw ParseError(line, "empty key");
    return {text.substr(0, eq), text.substr(eq + 1)};
}

int main() {
    std::string text;
    int line = 0, ok = 0;
    while (std::getline(std::cin, text)) {
        ++line;
        try {
            auto [key, value] = parse_line(text, line);
            std::cout << key << " -> " << value << '\n';
            ++ok;
        } catch (const ParseError& e) {
            std::cout << "line " << e.line() << ": " << e.what() << '\n';
        }
    }
    std::cout << "ok: " << ok << '\n';
}
```

```hint
Store the line number in a private member, set by the constructor; pass the message to the
`std::runtime_error` base: `ParseError(int line, const std::string& msg) : std::runtime_error(msg), line_(line) {}`.
```

```hint
`text.find('=')` returns `std::string::npos` when there's no `=`, and `0` when the line starts with `=`.
Split on the **first** `=`: the value may contain more `=` characters.
```

```stdin
name=Ada
lang C++
=oops
mode=a=b
```

```expected
name -> Ada
line 2: missing '='
line 3: empty key
mode -> a=b
ok: 2
```

```stdin
x=

y=1
```

```expected hidden
x -> 
line 2: missing '='
y -> 1
ok: 2
```

```checks
must class\s+ParseError\s*:\s*public\s+std::runtime_error :: ParseError must derive publicly from std::runtime_error.
must int\s+line\s*\(\s*\)\s*const :: Give ParseError an int line() const member function.
must \.line\s*\(\s*\) :: Use e.line() in the handler.
```
:::

:::exercise Bank errors
Build a small exception hierarchy for a bank:

- `BankError`, deriving publicly from `std::runtime_error` (the base for all bank problems).
- `AccountNotFound`, deriving from `BankError`, with message `no account NAME`.
- `InsufficientFunds`, deriving from `BankError`, with message `NAME cannot pay AMOUNT`, and a member
  function `long long missing() const` returning how much money was missing.

Accounts are kept in a `std::map<std::string, long long>`. Commands:

- `open NAME AMOUNT`: create (or overwrite) an account with that balance. Prints nothing.
- `pay NAME AMOUNT`: subtract `AMOUNT`. Throws `AccountNotFound` or `InsufficientFunds` (leaving the
  balance unchanged). On success prints `NAME has BALANCE`.

Handle errors in `main` with **separate handlers**: for `InsufficientFunds` print
`declined: MESSAGE (missing M)`; for any other `BankError` print `error: MESSAGE`.

**Input:** one command per line.
**Output:** as described.

```cpp starter
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>

std::map<std::string, long long> accounts;

void pay(const std::string& name, long long amount) {
    accounts[name] -= amount;
    std::cout << name << " has " << accounts[name] << '\n';
}

int main() {
    std::string cmd, name;
    long long amount;
    while (std::cin >> cmd >> name >> amount) {
        if (cmd == "open") accounts[name] = amount;
        else pay(name, amount);
    }
}
```

```cpp solution
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class AccountNotFound : public BankError {
public:
    explicit AccountNotFound(const std::string& name) : BankError("no account " + name) {}
};

class InsufficientFunds : public BankError {
public:
    InsufficientFunds(const std::string& name, long long amount, long long missing)
        : BankError(name + " cannot pay " + std::to_string(amount)), missing_(missing) {}

    long long missing() const { return missing_; }

private:
    long long missing_;
};

std::map<std::string, long long> accounts;

void pay(const std::string& name, long long amount) {
    auto it = accounts.find(name);
    if (it == accounts.end()) throw AccountNotFound(name);
    if (it->second < amount) throw InsufficientFunds(name, amount, amount - it->second);
    it->second -= amount;
    std::cout << name << " has " << it->second << '\n';
}

int main() {
    std::string cmd, name;
    long long amount;
    while (std::cin >> cmd >> name >> amount) {
        try {
            if (cmd == "open") accounts[name] = amount;
            else pay(name, amount);
        } catch (const InsufficientFunds& e) {
            std::cout << "declined: " << e.what() << " (missing " << e.missing() << ")\n";
        } catch (const BankError& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
}
```

```hint
Each derived class passes its finished message up to its base:
`explicit AccountNotFound(const std::string& name) : BankError("no account " + name) {}`.
```

```hint
Put `catch (const InsufficientFunds& e)` **before** `catch (const BankError& e)`, or the general
handler would catch everything.
```

```stdin
open ada 100
pay ada 30
pay ada 100
pay bob 5
open bob 5
pay bob 5
```

```expected
ada has 70
declined: ada cannot pay 100 (missing 30)
error: no account bob
bob has 0
```

```stdin
pay ghost 1
open zed 0
pay zed 1
```

```expected hidden
error: no account ghost
declined: zed cannot pay 1 (missing 1)
```

```checks
must class\s+BankError\s*:\s*public\s+std::runtime_error :: BankError must derive publicly from std::runtime_error.
must class\s+AccountNotFound\s*:\s*public\s+BankError :: AccountNotFound must derive from BankError.
must class\s+InsufficientFunds\s*:\s*public\s+BankError :: InsufficientFunds must derive from BankError.
must catch\s*\(\s*const\s+InsufficientFunds\s*& :: Catch InsufficientFunds separately.
must catch\s*\(\s*const\s+BankError\s*& :: Catch the remaining bank errors as BankError.
```
:::
