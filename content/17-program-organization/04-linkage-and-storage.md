---
title: Storage Duration & Linkage
summary: When objects are created and destroyed (automatic, static, thread, dynamic), which names are visible across files (no, internal, external linkage), static, extern, inline variables, and constinit.
---

## Two different questions

Every variable has two properties that are easy to confuse:

- **Storage duration**: *when* does the object exist? From where to where in the program's run?
- **Linkage**: *which files* can refer to the name? Only this scope, only this `.cpp` file, or the whole program?

The keyword `static` affects **both**, depending on where you write it, which is why this lesson
exists.

## Storage duration

| Duration | Objects | Created | Destroyed |
| --- | --- | --- | --- |
| **automatic** | local variables, parameters | when execution reaches the definition | at the end of the enclosing block (`}`) |
| **static** | globals, namespace variables, `static` locals, `static` data members | before `main` (globals) or the first time execution passes the definition (`static` locals) | after `main` returns, in **reverse** order of creation |
| **thread** | variables declared `thread_local` | when the thread starts (or first use) | when the thread ends |
| **dynamic** | objects made with `new` (or by `make_unique` etc.) | at `new` | at `delete` (smart pointers call it for you) |

```cpp run
#include <iostream>
#include <memory>
#include <string>

struct Noisy {
    std::string name;
    explicit Noisy(std::string n) : name(std::move(n)) { std::cout << "  + " << name << '\n'; }
    ~Noisy() { std::cout << "  - " << name << '\n'; }
};

Noisy global{"global (static duration)"};

void f() {
    static Noisy once{"static local"};        // created on the FIRST call only
    Noisy local{"automatic local"};           // created and destroyed on every call
}

int main() {
    std::cout << "main starts\n";
    f();
    f();
    {
        auto heap = std::make_unique<Noisy>("dynamic");
        std::cout << "  (inner block ends)\n";
    }                                         // unique_ptr deletes it here
    std::cout << "main ends\n";
}                                             // then statics die, newest first
```

```output
  + global (static duration)
main starts
  + static local
  + automatic local
  - automatic local
  + automatic local
  - automatic local
  + dynamic
  (inner block ends)
  - dynamic
main ends
  - static local
  - global (static duration)
```

### Static local variables

A `static` local variable lives for the whole program but is only **visible** inside its function.
It's initialized exactly once, the first time control passes through its definition, and keeps its
value between calls:

```cpp run
#include <iostream>

int nextTicket() {
    static int counter = 100;   // initialized once, on the first call
    return ++counter;
}

int main() {
    std::cout << nextTicket() << ' ' << nextTicket() << ' ';
    std::cout << nextTicket() << '\n';
}
```

```output
101 102 103
```

Since C++11, that first-time initialization is **thread-safe**: if two threads call the function at
once, one initializes and the other waits.

> **Note:** A `static` local is still a form of global state, with all the usual downsides (hidden
> coupling, harder testing). Use it for caches, counters, and lazily created singletons, not as a way
> to avoid passing parameters.

### Thread storage duration

`thread_local` gives each thread its **own** copy of a variable (you'll meet threads in the concurrency
lesson):

```cpp run
#include <iostream>
#include <thread>

thread_local int callsInThisThread = 0;

int work(int times) {
    for (int i = 0; i < times; ++i) ++callsInThisThread;
    return callsInThisThread;
}

int main() {
    int a = 0;
    int b = 0;
    std::thread t1([&a] { a = work(3); });
    std::thread t2([&b] { b = work(5); });
    t1.join();
    t2.join();
    std::cout << "thread 1 saw " << a << ", thread 2 saw " << b
              << ", main sees " << callsInThisThread << '\n';
}
```

```output
thread 1 saw 3, thread 2 saw 5, main sees 0
```

## Linkage

**Linkage** decides whether the same name in different places refers to the same entity.

| Linkage | Meaning | Examples |
| --- | --- | --- |
| **none** | the name is only usable in its own scope | local variables, parameters |
| **internal** | visible throughout **one** translation unit (`.cpp` + its headers) only | `static` globals and functions, anything in an anonymous namespace, `const`/`constexpr` globals |
| **external** | the same entity across **all** translation units | ordinary (non-`const`) globals and functions, classes |

### External linkage and `extern`

A normal global variable has external linkage: any file can use it, but exactly one file may define it
(the One Definition Rule). Other files **declare** it with `extern`, which means "this exists, defined
elsewhere; don't create storage here":

```cpp
// file: config.h
#pragma once
extern int maxPlayers;          // declaration only: no storage, no initializer

// file: config.cpp
#include "config.h"
int maxPlayers = 8;             // THE definition (exactly one in the program)

// file: game.cpp
#include "config.h"
void start() { if (maxPlayers > 4) { /* ... */ } }   // uses the one in config.cpp
```

Simulated in one file:

```cpp run
#include <iostream>

// ===== config.h =====
extern int maxPlayers;               // declaration

// ===== game.cpp =====
void announce() {
    std::cout << "up to " << maxPlayers << " players\n";
}

// ===== config.cpp =====
int maxPlayers = 8;                  // definition

// ===== main.cpp =====
int main() {
    announce();
    maxPlayers = 12;                 // everyone shares the same variable
    announce();
}
```

```output
up to 8 players
up to 12 players
```

Functions have external linkage by default, and a function declaration is implicitly `extern`, which is
why headers can just say `int add(int, int);`.

> **Pitfall:** `extern int x = 5;` is a *definition* (the initializer wins). Don't put it in a header.

### Internal linkage: `static` at namespace scope and anonymous namespaces

Sometimes a `.cpp` file needs a helper that nobody else should see, and that must not collide with a
helper of the same name in another file. Give it **internal linkage**:

```cpp
// file: parser.cpp
static int helper(int x) { return x * 2; }      // old style: static = internal linkage

namespace {                                     // modern style: anonymous namespace
    int lineCount = 0;
    int helper2(int x) { return x + 1; }
}
```

Note the two completely different meanings of `static`:

```cpp
static int a = 0;           // at namespace scope: INTERNAL LINKAGE (duration was already static)

void f() {
    static int b = 0;       // in a function: STATIC DURATION (linkage stays "none")
}

struct S {
    static int c;           // in a class: one shared variable for the class, not one per object
};
```

### `const` globals have internal linkage

A namespace-scope `const` or `constexpr` variable has **internal** linkage by default. That's why you can
put `const int maxSize = 100;` in a header without "multiple definition" errors: each `.cpp` gets its own
private copy. (Use `extern const int maxSize;` if you really want one shared object.)

## Inline variables (C++17)

Before C++17, sharing a global through a header needed the `extern` dance above. An `inline` variable
can be **defined** in a header: every translation unit sees the definition, and the linker merges them
into **one** object (just like `inline` functions):

```cpp
// file: settings.h
#pragma once
#include <string>

inline int verbosity = 1;                          // one shared variable, defined in the header
inline const std::string appName = "skill-issue";  // one shared object

struct Registry {
    static inline int instances = 0;               // static data member defined in-class
    static constexpr int maxInstances = 10;        // constexpr static members are implicitly inline
};
```

```cpp run
#include <iostream>

// ===== registry.h =====
struct Registry {
    static inline int instances = 0;   // no separate definition in a .cpp needed
    Registry() { ++instances; }
    ~Registry() { --instances; }
};

inline int verbosity = 2;

// ===== main.cpp =====
int main() {
    Registry a;
    {
        Registry b;
        Registry c;
        std::cout << "inside: " << Registry::instances << '\n';
    }
    std::cout << "after: " << Registry::instances << ", verbosity " << verbosity << '\n';
}
```

```output
inside: 3
after: 1, verbosity 2
```

## The static initialization order fiasco

Globals in **one** file are initialized top to bottom. But between **different** files, the order is
**unspecified**. If a global in `a.cpp` uses a global from `b.cpp` during its initialization, it may
see it before it was initialized:

```cpp
// file: logger.cpp
std::string logPrefix = "[app] ";                   // dynamic initialization

// file: startup.cpp
extern std::string logPrefix;
std::string banner = logPrefix + "starting";        // may run BEFORE logPrefix is constructed!
```

This bug is famous enough to have a name: the **static initialization order fiasco**. The classic fix
is to replace the global with a function that returns a `static` local, which is initialized on first
use (the "Meyers singleton"):

```cpp
const std::string& logPrefix() {
    static const std::string prefix = "[app] ";   // initialized the first time someone asks
    return prefix;
}
std::string banner = logPrefix() + "starting";    // safe
```

## `constinit` (C++20)

Globals with a **constant** initializer (like `int limit = 10;`) are initialized at compile time, before
any code runs, so they're immune to the fiasco. `constinit` lets you **require** that: if the
initializer isn't a constant expression, compilation fails. Unlike `constexpr`, the variable can still
be modified at runtime.

```cpp run
#include <iostream>

constexpr int defaultLimit() { return 64; }

constinit int limit = defaultLimit() * 2;   // guaranteed compile-time initialization
constinit thread_local int depth = 0;       // works with thread_local too

int main() {
    std::cout << limit << '\n';
    limit = 10;                             // not const: can change at runtime
    ++depth;
    std::cout << limit << ' ' << depth << '\n';
}
```

```output
128
10 1
```

```cpp compile-error
int readConfig() { return 7; }              // not constexpr

constinit int value = readConfig();          // error: 'constinit' variable does not have a constant initializer

int main() {}
```

| | `const` | `constexpr` | `constinit` |
| --- | --- | --- | --- |
| Can change later? | no | no | **yes** |
| Initializer must be constant? | no | yes | yes |
| Usable in constant expressions? | only for integral types with constant initializers | yes | no |
| Allowed on locals? | yes | yes | only `static`/`thread_local` ones |

:::quiz
What does `static` mean on a variable **inside a function**?

- [ ] The variable can't be modified
- [ ] The variable has internal linkage
- [x] The variable keeps its value between calls (static storage duration)
- [ ] The variable is shared between all threads only if it's also `const`

Inside a function, `static` changes the storage duration: the variable is initialized once and lives
until the program ends. At namespace scope, `static` instead means internal linkage.
:::

:::quiz
A header contains `int counter = 0;` and is included by `a.cpp` and `b.cpp`. What happens when you link them?

- [ ] Each file gets its own `counter`
- [x] "multiple definition of `counter`" link error
- [ ] It works and they share one `counter`
- [ ] Compile error in the header

The header **defines** a variable with external linkage, and the definition ends up in two object
files, which breaks the One Definition Rule. Write `inline int counter = 0;` (one shared variable) or
`extern int counter;` in the header plus one definition in a `.cpp`.
:::

:::quiz
Which keyword guarantees compile-time initialization but still allows the variable to change at runtime?

- [ ] `constexpr`
- [ ] `consteval`
- [x] `constinit`
- [ ] `inline`

`constinit` only constrains the **initialization**. `constexpr` variables are also `const`.
:::

:::exercise Ticket machine
Write `int nextId()` that returns `1000` the first time it's called, then `1001`, `1002`, and so on.
Keep the counter in a **`static` local variable** inside `nextId` (no global variables).

Read names (one word each) until the end of input. For each, print `<name> -> <id>`. Finally print
`issued: <count>`.

```cpp starter
#include <iostream>
#include <string>

int nextId() {
    int counter = 1000;
    return counter;
}

int main() {
    std::string name;
    int count = 0;
    while (std::cin >> name) {
        std::cout << name << " -> " << nextId() << '\n';
        ++count;
    }
    std::cout << "issued: " << count << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int nextId() {
    static int counter = 1000;
    return counter++;
}

int main() {
    std::string name;
    int count = 0;
    while (std::cin >> name) {
        std::cout << name << " -> " << nextId() << '\n';
        ++count;
    }
    std::cout << "issued: " << count << '\n';
}
```

```hint
Adding `static` to the local makes it initialize once and remember its value. Return the current value
and then increment it: `return counter++;`.
```

```stdin
ada grace linus
```

```expected
ada -> 1000
grace -> 1001
linus -> 1002
issued: 3
```

```stdin
solo
```

```expected hidden
solo -> 1000
issued: 1
```

```expected
issued: 0
```

```checks
must static\s+int\s+\w+\s*=\s*1000 :: Keep the counter in a static local initialized to 1000.
mustnot ^(?:static\s+)?int\s+\w+\s*(?:=|;|\{) :: Don't use a global variable for the counter.
```
:::

:::exercise Cached Fibonacci
Write `long long fib(int n)` (`fib(0) = 0`, `fib(1) = 1`, `fib(n) = fib(n-1) + fib(n-2)`) that
**remembers** results in a `static std::map<int, long long>` (or `std::unordered_map`) local to the
function, so each value is computed only once across all calls.

Also count how many times a value is actually **computed** (a cache miss) in a counter that lives in an
**anonymous namespace**.

Read queries `n` (0 ≤ n ≤ 90) until the end of input and print `fib(<n>) = <value>` for each, then
`computed: <number of cache misses>`.

```cpp starter
#include <iostream>
#include <map>

long long fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    int n;
    while (std::cin >> n) {
        std::cout << "fib(" << n << ") = " << fib(n) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <map>

namespace {
    int computed = 0;
}

long long fib(int n) {
    static std::map<int, long long> cache;
    auto it = cache.find(n);
    if (it != cache.end()) return it->second;
    ++computed;
    long long value = n < 2 ? n : fib(n - 1) + fib(n - 2);
    cache[n] = value;
    return value;
}

int main() {
    int n;
    while (std::cin >> n) {
        std::cout << "fib(" << n << ") = " << fib(n) << '\n';
    }
    std::cout << "computed: " << computed << '\n';
}
```

```hint
Look the value up first; only on a miss do the recursive computation, increment the counter, and store
the result.
```

```hint
Every `n` from 0 up to the largest query is computed exactly once, so the final count is
`(largest n) + 1` when the first query is the largest.
```

```stdin
10
5
10
```

```expected
fib(10) = 55
fib(5) = 5
fib(10) = 55
computed: 11
```

```stdin
3
90
```

```expected hidden
fib(3) = 2
fib(90) = 2880067194370816120
computed: 91
```

```stdin
0
```

```expected
fib(0) = 0
computed: 1
```

```checks
must static\s+std::(?:unordered_)?map\s*< :: Cache results in a static std::map local to fib.
must namespace\s*\{ :: Keep the counter in an anonymous namespace.
```
:::

:::exercise Lifetime tracer
Demonstrate all the storage durations by writing a `struct Tracer` whose constructor prints
`construct <name>` and whose destructor prints `destroy <name>`. Then create:

- a **global** `Tracer` named `global`,
- in a function `void visit(int i)`: a **`static` local** `Tracer` named `static`, then an **automatic** `Tracer`
  named `auto <i>`, then print `visit <i>`,
- in `main`: print `main starts`, read `n`, create a **dynamic** `Tracer` named `dynamic` with
  `std::make_unique`, call `visit(1)` ... `visit(n)`, destroy the dynamic one with `.reset()`, and
  print `main ends`.

For `n = 1` the full output is:

```
construct global
main starts
construct dynamic
construct static
construct auto 1
visit 1
destroy auto 1
destroy dynamic
main ends
destroy static
destroy global
```

```cpp starter
#include <iostream>
#include <memory>
#include <string>

struct Tracer {
    std::string name;
    explicit Tracer(std::string n) : name(std::move(n)) {}
};

int main() {
    std::cout << "main starts\n";
    int n;
    std::cin >> n;
    std::cout << "main ends\n";
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>

struct Tracer {
    std::string name;
    explicit Tracer(std::string n) : name(std::move(n)) {
        std::cout << "construct " << name << '\n';
    }
    ~Tracer() {
        std::cout << "destroy " << name << '\n';
    }
};

Tracer global{"global"};

void visit(int i) {
    static Tracer once{"static"};
    Tracer local{"auto " + std::to_string(i)};
    std::cout << "visit " << i << '\n';
}

int main() {
    std::cout << "main starts\n";
    int n;
    std::cin >> n;
    auto dynamic = std::make_unique<Tracer>("dynamic");
    for (int i = 1; i <= n; ++i) {
        visit(i);
    }
    dynamic.reset();
    std::cout << "main ends\n";
}
```

```hint
The `static` local is constructed the first time `visit` runs (so never, if `n` is 0) and destroyed
after `main` returns, **before** the global, because statics die in reverse order of construction.
```

```stdin
1
```

```expected
construct global
main starts
construct dynamic
construct static
construct auto 1
visit 1
destroy auto 1
destroy dynamic
main ends
destroy static
destroy global
```

```stdin
2
```

```expected hidden
construct global
main starts
construct dynamic
construct static
construct auto 1
visit 1
destroy auto 1
construct auto 2
visit 2
destroy auto 2
destroy dynamic
main ends
destroy static
destroy global
```

```stdin
0
```

```expected
construct global
main starts
construct dynamic
destroy dynamic
main ends
destroy global
```

```checks
must static\s+Tracer :: Use a static local Tracer inside visit.
must make_unique\s*<\s*Tracer\s*> :: Create the dynamic Tracer with std::make_unique.
must ~Tracer :: Give Tracer a destructor that prints.
```
:::
