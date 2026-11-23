---
title: Exceptions Basics
summary: throw, try and catch. How an exception travels up the call stack, catching by const reference, multiple handlers and their order, catch(...), stack unwinding, std::terminate, and rethrowing.
---

## The three keywords

- **`throw expr;`** creates an exception object from `expr` and starts looking for a handler.
  The current function stops immediately.
- **`try { ... }`** marks a block of code whose exceptions you want to handle.
- **`catch (Type name) { ... }`** right after a `try` is a **handler**. It runs if an exception of a
  matching type escapes the `try` block.

```cpp run
#include <iostream>
#include <stdexcept>

int main() {
    std::cout << "before\n";
    try {
        std::cout << "in try\n";
        throw std::runtime_error("something broke");
        std::cout << "never printed\n";           // skipped: throw leaves the block immediately
    } catch (const std::runtime_error& e) {
        std::cout << "caught: " << e.what() << '\n';
    }
    std::cout << "after\n";                       // execution continues after the handler
}
```

```output
before
in try
caught: something broke
after
```

When nothing throws, the `catch` blocks are skipped entirely. When something throws, the rest of the
`try` block is skipped, the matching handler runs, and the program continues **after** the whole
`try`/`catch` statement. It does **not** go back into the `try`.

`what()` is a member function of `std::exception` (and every standard exception) that returns the
message as a C-string (`const char*`).

## Exceptions travel up the call stack

The real power: the `throw` and the `catch` can be in **different functions**, any number of calls
apart. Functions in between need no error-handling code at all:

```cpp run
#include <iostream>
#include <stdexcept>
#include <string>

int parse_digit(char c) {
    if (c < '0' || c > '9') throw std::invalid_argument(std::string("not a digit: ") + c);
    return c - '0';
}

int sum_digits(const std::string& s) {
    int total = 0;
    for (char c : s) total += parse_digit(c);   // if this throws, sum_digits stops too
    return total;
}

int main() {
    for (std::string s : {"123", "4x6", "99"}) {
        try {
            int total = sum_digits(s);                 // may throw
            std::cout << s << " -> " << total << '\n';  // skipped if it did
        } catch (const std::invalid_argument& e) {
            std::cout << s << " -> error (" << e.what() << ")\n";
        }
    }
}
```

```output
123 -> 6
4x6 -> error (not a digit: x)
99 -> 18
```

For `4x6`, `parse_digit` threw on the `x`. That ended `parse_digit`, then `sum_digits` (in the
middle of its loop), and the rest of the `try` block, and landed in the handler in `main`. Note that
anything that already happened before the throw (output printed, variables changed) is **not**
undone. That's why the result is stored first and printed afterwards: with
`std::cout << s << " -> " << sum_digits(s)`, the `"4x6 -> "` part would already be printed when the
exception hits (since C++17, a `<<` chain is evaluated left to right).

## What can be thrown

You can throw a value of almost any type: `throw 42;`, `throw "oops";`, `throw std::string("oops");`.
The handler is chosen by **exact type**, with only a few conversions allowed (a derived class matches
a base class handler, and arrays/functions decay to pointers). In particular, **no numeric
conversions**: an `int` isn't caught by `catch (long)` or `catch (double)`.

```cpp run
#include <iostream>
#include <string>

void fail(int kind) {
    if (kind == 1) throw 42;                      // int
    if (kind == 2) throw "a C-string";            // const char*
    if (kind == 3) throw std::string("a string"); // std::string
    throw 3.14;                                   // double
}

int main() {
    for (int kind = 1; kind <= 4; ++kind) {
        try {
            fail(kind);
        } catch (double d) {
            std::cout << "double " << d << '\n';
        } catch (int i) {
            std::cout << "int " << i << '\n';
        } catch (const char* s) {
            std::cout << "const char* " << s << '\n';
        } catch (const std::string& s) {
            std::cout << "std::string " << s << '\n';
        }
    }
}
```

```output
int 42
const char* a C-string
std::string a string
double 3.14
```

`42` skipped the `catch (double)` handler, because no conversion is made. In real code, throw
objects of classes derived from **`std::exception`** (next lesson). Everyone knows how to catch
those, and they carry a message.

## Catch by `const` reference

Write handlers as **`catch (const Type& e)`**:

- **No copy** is made of the exception object.
- **No slicing.** If you catch a base class *by value*, a derived exception is copied into a plain
  base object, and its derived parts (including its `what()` override) are cut off.
- `const`, because a handler rarely needs to modify the exception.

```cpp run
#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::out_of_range("index 7 is too big");
    } catch (const std::exception& e) {      // a base-class reference: sees the real object
        std::cout << e.what() << '\n';
    }
}
```

```output
index 7 is too big
```

## Multiple handlers: order matters

A `try` can have several `catch` blocks. They're tried **top to bottom**, and the **first** one that
matches wins. Since a base-class handler also matches every derived class, put the **most specific
(derived) types first** and the most general last:

```cpp run
#include <iostream>
#include <stdexcept>

void risky(int n) {
    if (n == 1) throw std::out_of_range("bad index");        // out_of_range -> logic_error -> exception
    if (n == 2) throw std::runtime_error("disk on fire");     // runtime_error -> exception
    if (n == 3) throw std::logic_error("broken promise");
}

int main() {
    for (int n = 0; n <= 3; ++n) {
        try {
            risky(n);
            std::cout << n << ": fine\n";
        } catch (const std::out_of_range& e) {      // most specific first
            std::cout << n << ": out_of_range: " << e.what() << '\n';
        } catch (const std::logic_error& e) {
            std::cout << n << ": logic_error: " << e.what() << '\n';
        } catch (const std::exception& e) {         // most general last
            std::cout << n << ": exception: " << e.what() << '\n';
        }
    }
}
```

```output
0: fine
1: out_of_range: bad index
2: exception: disk on fire
3: logic_error: broken promise
```

If you get the order wrong, the specific handler can never run. GCC warns about it:

```cpp run warns
#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("x");
    } catch (const std::exception&) {
        std::cout << "general handler\n";
    } catch (const std::runtime_error&) {   // warning: exception of type 'std::runtime_error' will be caught by earlier handler
        std::cout << "never reached\n";
    }
}
```

## `catch (...)`: catch anything

`catch (...)` (three literal dots) matches **every** exception type, but you can't see the object.
It must be the **last** handler. Use it as a final safety net, e.g. in `main`, or to clean up and
rethrow:

```cpp run
#include <iostream>
#include <stdexcept>

int main() {
    for (int i = 0; i < 3; ++i) {
        try {
            if (i == 0) throw std::runtime_error("known problem");
            if (i == 1) throw 404;
            std::cout << "no problem\n";
        } catch (const std::exception& e) {
            std::cout << "std::exception: " << e.what() << '\n';
        } catch (...) {
            std::cout << "something unknown was thrown\n";
        }
    }
}
```

```output
std::exception: known problem
something unknown was thrown
no problem
```

```cpp compile-error
int main() {
    try {
        throw 1;
    } catch (...) {
    } catch (int) {        // error: '...' handler must be the last handler for its try block
    }
}
```

## Stack unwinding: destructors still run

When an exception leaves a scope (a block or a whole function), every **local object** in that scope
is **destroyed**, in reverse order of construction, exactly as if the scope had ended normally. This
is called **stack unwinding**, and it's why RAII types (`std::vector`, `std::string`,
`std::unique_ptr`, `std::lock_guard`, ...) never leak, even when exceptions fly.

```cpp run
#include <iostream>
#include <stdexcept>
#include <string>

struct Noisy {
    std::string name;
    explicit Noisy(std::string n) : name(std::move(n)) { std::cout << "  create " << name << '\n'; }
    ~Noisy() { std::cout << "  destroy " << name << '\n'; }
};

void inner() {
    Noisy c("c (in inner)");
    throw std::runtime_error("boom");
    Noisy d("d (never created)");
}

void outer() {
    Noisy b("b (in outer)");
    inner();
    std::cout << "  not printed\n";
}

int main() {
    Noisy a("a (in main)");
    try {
        outer();
    } catch (const std::exception& e) {
        std::cout << "  caught " << e.what() << '\n';
    }
    std::cout << "  main continues\n";
}
```

```output
  create a (in main)
  create b (in outer)
  create c (in inner)
  destroy c (in inner)
  destroy b (in outer)
  caught boom
  main continues
  destroy a (in main)
```

`c` and `b` were destroyed **before** the handler ran, while unwinding. `a` lives in `main`, outside
the `try`, so it lives on until `main` ends. Objects that were never constructed (`d`) are not destroyed.

> **Warning:** Unwinding only destroys **objects**. Memory from a raw `new` with no owning object is
> leaked when an exception skips the `delete`. That's one more reason to use smart pointers and
> containers instead of `new`/`delete`.

## Uncaught exceptions: `std::terminate`

If an exception escapes `main` (no handler anywhere matched), the program calls
**`std::terminate()`**, which by default calls `std::abort()`: the program dies immediately with an
error such as `terminate called after throwing an instance of 'std::runtime_error'`. It's
implementation-defined whether any unwinding happens first, so destructors may not run.

```cpp
#include <stdexcept>

int main() {
    throw std::runtime_error("nobody catches me");   // std::terminate -> abort, exit code != 0
}
```

That's why many programs wrap the body of `main` in a `try` with a final `catch (const std::exception&)`
(and maybe `catch (...)`), to print a useful message and exit cleanly.

## Rethrowing with `throw;`

Inside a handler, a bare **`throw;`** (no operand) rethrows the **current exception object**,
unchanged, to the next handler up. This is for code that wants to react to an error (log it, undo
something) but can't fully handle it:

```cpp run
#include <iostream>
#include <stdexcept>

void save() {
    throw std::runtime_error("disk full");
}

void save_with_logging() {
    try {
        save();
    } catch (const std::exception& e) {
        std::cout << "log: save failed: " << e.what() << '\n';
        throw;                                     // pass the SAME exception on
    }
}

int main() {
    try {
        save_with_logging();
    } catch (const std::runtime_error& e) {       // still a runtime_error: type preserved
        std::cout << "main: " << e.what() << '\n';
    }
}
```

```output
log: save failed: disk full
main: disk full
```

> **Pitfall:** `throw e;` is **not** the same as `throw;`. `throw e;` throws a **copy** of `e` with
> the **static type** of `e`. In a `catch (const std::exception& e)` handler, that slices a
> `std::runtime_error` down to a plain `std::exception`, so later handlers for `runtime_error` won't
> match it anymore. Always use `throw;` to rethrow.

A bare `throw;` outside any handler (when no exception is active) calls `std::terminate`.

## When (not) to use exceptions

- Do use them for errors that the **immediate caller usually can't handle**, and for failures in
  constructors and operators.
- Don't use them for normal control flow ("loop until an exception says we're done"). Throwing is
  far slower than a `return`, and it hides the logic.
- Don't throw for programmer bugs that should never happen. Use assertions for those.

:::quiz
What does this print?

```cpp
try {
    std::cout << "A";
    throw 1;
    std::cout << "B";
} catch (int) {
    std::cout << "C";
}
std::cout << "D";
```

- [ ] `ABCD`
- [x] `ACD`
- [ ] `AC`
- [ ] `ABD`

`throw` skips the rest of the try block (`B`); the handler prints `C`; then execution continues after the try/catch (`D`).
:::

:::quiz
`f()` throws `std::out_of_range` (which derives from `std::logic_error`, which derives from
`std::exception`). Which handler runs?

```cpp
try { f(); }
catch (const std::exception& e) { std::cout << "1"; }
catch (const std::logic_error& e) { std::cout << "2"; }
catch (const std::out_of_range& e) { std::cout << "3"; }
```

- [x] `1`
- [ ] `2`
- [ ] `3`
- [ ] All three

Handlers are tried top to bottom and the **first match** wins. `std::exception` matches everything derived from it, so the other two are unreachable. Put the most derived types first.
:::

:::quiz
Which statement about `throw;` (with no operand) is true?

- [ ] It throws a default-constructed `std::exception`
- [x] Inside a handler, it rethrows the current exception object with its original type
- [ ] It's the same as `throw e;` inside `catch (const std::exception& e)`
- [ ] It ends the program normally

`throw;` rethrows the very same object. `throw e;` would throw a copy with `e`'s static type, possibly slicing it.
:::

:::exercise Catch the division {easy}
Write `long long divide(long long a, long long b)` that throws
`std::runtime_error("division by zero")` when `b` is `0`, and otherwise returns `a / b`. In `main`,
read pairs until the end of input, call `divide` inside a `try`, and handle the error with a `catch`.

**Input:** any number of lines `a b`.
**Output:** for each line, the quotient, or `error: division by zero`.

```cpp starter
#include <iostream>
#include <stdexcept>

long long divide(long long a, long long b) {
    return a / b;
}

int main() {
    long long a, b;
    while (std::cin >> a >> b) {
        if (b == 0) continue;
        std::cout << divide(a, b) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>

long long divide(long long a, long long b) {
    if (b == 0) throw std::runtime_error("division by zero");
    return a / b;
}

int main() {
    long long a, b;
    while (std::cin >> a >> b) {
        try {
            std::cout << divide(a, b) << '\n';
        } catch (const std::runtime_error& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
}
```

```hint
In `divide`: `if (b == 0) throw std::runtime_error("division by zero");`
```

```hint
Put the call inside `try { ... }` and add `catch (const std::runtime_error& e)` that prints
`"error: " << e.what()`.
```

```stdin
10 3
5 0
-8 2
```

```expected
3
error: division by zero
-4
```

```stdin
0 0
```

```expected hidden
error: division by zero
```

```stdin
-9 -3
9223372036854775807 0
1 1
```

```expected hidden
3
error: division by zero
1
```

```checks
must \bthrow\b :: divide must throw an exception.
must \bcatch\s*\( :: Handle the exception with catch.
must \btry\b :: Use a try block.
```
:::

:::exercise Sort the throws {medium}
Write `void raise(const std::string& kind, const std::string& arg)` that throws a value of a different
**type** depending on `kind`:

| `kind` | throws |
| --- | --- |
| `int` | `std::stoi(arg)` (an `int`) |
| `double` | `std::stod(arg)` (a `double`) |
| `text` | `std::string(arg)` |
| anything else | `kind.size()` (a `std::size_t`) |

In `main`, read lines `kind arg` until the end of input, call `raise`, and catch the exception with
separate handlers: print `int: V`, `double: V`, `text: V`, and for anything else (use `catch (...)`)
print `unknown`.

Careful: if `arg` isn't a number, `std::stoi`/`std::stod` throw their **own** exception before your
`throw` happens. Think about which of your handlers catches that one.

**Input:** any number of lines `kind arg`.
**Output:** one line per input line, as described.

```cpp starter
#include <iostream>
#include <string>

void raise(const std::string& kind, const std::string& arg) {
    if (kind == "int") throw std::stoi(arg);
    if (kind == "double") throw std::stod(arg);
    if (kind == "text") throw std::string(arg);
    throw kind.size();
}

int main() {
    std::string kind, arg;
    while (std::cin >> kind >> arg) {
        try {
            raise(kind, arg);
        } catch (int v) {
            std::cout << "int: " << v << '\n';
        }
    }
}
```

```cpp solution
#include <iostream>
#include <string>

void raise(const std::string& kind, const std::string& arg) {
    if (kind == "int") throw std::stoi(arg);
    if (kind == "double") throw std::stod(arg);
    if (kind == "text") throw std::string(arg);
    throw kind.size();
}

int main() {
    std::string kind, arg;
    while (std::cin >> kind >> arg) {
        try {
            raise(kind, arg);
        } catch (int v) {
            std::cout << "int: " << v << '\n';
        } catch (double v) {
            std::cout << "double: " << v << '\n';
        } catch (const std::string& v) {
            std::cout << "text: " << v << '\n';
        } catch (...) {
            std::cout << "unknown\n";
        }
    }
}
```

```hint
Add one `catch` per type: `catch (double v)`, `catch (const std::string& v)`, and finally `catch (...)`.
```

```hint
`catch (...)` must be the last handler.
```

```stdin
int 42
text hello
double 2.5
bool true
```

```expected
int: 42
text: hello
double: 2.5
unknown
```

```stdin
int -7
long 5
```

```expected hidden
int: -7
unknown
```

```stdin
int abc
int 3.9
double 1e3
text 42
x y
```

```expected hidden
unknown
int: 3
double: 1000
text: 42
unknown
```

```checks
must catch\s*\(\s*\.\.\.\s*\) :: Use catch (...) for everything else.
must catch\s*\(\s*double :: Catch the double separately.
must catch\s*\(\s*const\s+std::string\s*& :: Catch the std::string by const reference.
```
:::

:::exercise Log and rethrow {medium}
Write `int checked_sqrt(int x)` that throws `std::domain_error("negative input")` for negative `x` and
otherwise returns the integer square root (the largest `r` with `r * r <= x`).

Write `int process(int x)` that calls `checked_sqrt` inside a `try`. If it throws, `process` prints
`log: X failed` (with the value of `x`) and **rethrows the same exception** with `throw;`.

`main` reads numbers until the end of input, calls `process`, and prints `sqrt: R` on success, or
`handled: MESSAGE` (from `what()`) when it catches the rethrown exception.

**Input:** any number of integers.
**Output:** as described: on failure, the `log:` line comes first, then the `handled:` line.

```cpp starter
#include <iostream>
#include <stdexcept>

int checked_sqrt(int x) {
    if (x < 0) throw std::domain_error("negative input");
    int r = 0;
    while ((r + 1) * (r + 1) <= x) ++r;
    return r;
}

int process(int x) {
    try {
        return checked_sqrt(x);
    } catch (const std::exception& e) {
        std::cout << "log: " << x << " failed\n";
        return 0;
    }
}

int main() {
    int x;
    while (std::cin >> x) {
        std::cout << "sqrt: " << process(x) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>

int checked_sqrt(int x) {
    if (x < 0) throw std::domain_error("negative input");
    int r = 0;
    while ((r + 1) * (r + 1) <= x) ++r;
    return r;
}

int process(int x) {
    try {
        return checked_sqrt(x);
    } catch (const std::exception&) {
        std::cout << "log: " << x << " failed\n";
        throw;
    }
}

int main() {
    int x;
    while (std::cin >> x) {
        try {
            int r = process(x);
            std::cout << "sqrt: " << r << '\n';
        } catch (const std::domain_error& e) {
            std::cout << "handled: " << e.what() << '\n';
        }
    }
}
```

```hint
In `process`'s handler, replace `return 0;` with a bare `throw;`.
```

```hint
Careful with output order: `std::cout << "sqrt: " << process(x)` prints `sqrt: ` before `process`
runs. Call `process` first and store the result, or make sure `sqrt: ` isn't printed when it fails.
```

```stdin
16
-4
10
```

```expected
sqrt: 4
log: -4 failed
handled: negative input
sqrt: 3
```

```stdin
0
-1
```

```expected hidden
sqrt: 0
log: -1 failed
handled: negative input
```

```stdin
1
-2147483648
99
2
```

```expected hidden
sqrt: 1
log: -2147483648 failed
handled: negative input
sqrt: 9
sqrt: 1
```

```checks
must throw\s*; :: Rethrow with a bare throw;
mustnot throw\s+e\s*; :: Use throw; not throw e; (that copies and may slice the exception).
```
:::

:::exercise Unwinding trace {medium}
Watch stack unwinding happen. A `Guard` struct prints `enter N` when created and `leave N` when
destroyed. `descend(level, fail_at)` creates a `Guard` for `level`, then:

- if `level == fail_at`, throws `std::runtime_error("failed at N")` (`N` = `level`);
- otherwise, if `level < 3`, calls `descend(level + 1, fail_at)`.

`main` reads `fail_at`, calls `descend(1, fail_at)` inside a `try`, and prints `caught: MESSAGE` if an
exception arrives, or `done` if not.

**Input:** one integer `fail_at`.
**Output:** the `enter`/`leave` lines as they happen, then `caught: ...` or `done`.

For example, with `fail_at = 2`:

```
enter 1
enter 2
leave 2
leave 1
caught: failed at 2
```

```cpp starter
#include <iostream>
#include <stdexcept>
#include <string>

struct Guard {
    int n;
    // print "enter n" in the constructor and "leave n" in the destructor
};

void descend(int level, int fail_at) {
    Guard g{level};
    if (level < 3) descend(level + 1, fail_at);
    (void)fail_at;
}

int main() {
    int fail_at;
    std::cin >> fail_at;
    descend(1, fail_at);
    std::cout << "done\n";
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <string>

struct Guard {
    int n;
    explicit Guard(int level) : n(level) { std::cout << "enter " << n << '\n'; }
    ~Guard() { std::cout << "leave " << n << '\n'; }
};

void descend(int level, int fail_at) {
    Guard g(level);
    if (level == fail_at) throw std::runtime_error("failed at " + std::to_string(level));
    if (level < 3) descend(level + 1, fail_at);
}

int main() {
    int fail_at;
    std::cin >> fail_at;
    try {
        descend(1, fail_at);
        std::cout << "done\n";
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << '\n';
    }
}
```

```hint
Give `Guard` a constructor that takes the level and prints `enter`, and a destructor `~Guard()` that
prints `leave`.
```

```hint
Build the message with `"failed at " + std::to_string(level)`. Notice that every `leave` line
appears **before** `caught:`: the guards are destroyed during unwinding, before the handler runs.
```

```stdin
2
```

```expected
enter 1
enter 2
leave 2
leave 1
caught: failed at 2
```

```stdin
0
```

```expected
enter 1
enter 2
enter 3
leave 3
leave 2
leave 1
done
```

```stdin
3
```

```expected hidden
enter 1
enter 2
enter 3
leave 3
leave 2
leave 1
caught: failed at 3
```

```stdin
1
```

```expected hidden
enter 1
leave 1
caught: failed at 1
```

```stdin
7
```

```expected hidden
enter 1
enter 2
enter 3
leave 3
leave 2
leave 1
done
```

```checks
must ~\s*Guard\s*\( :: Give Guard a destructor.
must \bcatch\s*\( :: Catch the exception in main.
```
:::
