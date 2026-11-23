---
title: Static Locals, Globals & Lifetime
summary: When variables are created and destroyed, static local variables that remember values between calls, global variables and why to avoid them.
---

Every variable has a **scope** (where in the code its name can be used) and a **lifetime** (when
it exists in memory). They're related but not the same, and this lesson is about the difference.

## Local variables: automatic storage

The variables you've written inside functions so far have **automatic storage duration**:

- they're **created** when execution reaches their definition,
- they're **destroyed** when execution leaves the enclosing block `{ }`,
- every call to the function gets **fresh** copies.

```cpp run
#include <iostream>

void visit() {
    int count = 0;          // created fresh on every call
    ++count;
    std::cout << "count = " << count << '\n';
}                           // count is destroyed here

int main() {
    visit();
    visit();
    visit();
}
```

```output
count = 1
count = 1
count = 1
```

That's why a local can't "remember" anything between calls. It's also why returning a reference to
a local is a bug: the variable is gone by the time the caller uses it.

> **Warning:** An automatic variable of a basic type (`int`, `double`, ...) that you don't initialize
> holds an **indeterminate** value, whatever bits happened to be in that memory. Reading it is
> undefined behavior. Always initialize: `int count = 0;` or `int count{};`.

Blocks inside a function have the same rule. A variable declared inside a loop body is created and
destroyed on **every iteration**:

```cpp
for (int i = 0; i < 3; ++i) {
    int square = i * i;     // a new 'square' each time round
}                           // destroyed at the end of each iteration
// i and square don't exist here
```

## Static local variables: remember between calls

Add `static` to a local variable and its **lifetime** changes completely, while its **scope** stays
the same:

- it's **initialized once**, the first time execution reaches its definition,
- it **lives until the program ends**, keeping its value between calls,
- it's still **only visible inside that function**.

```cpp run
#include <iostream>

void visit() {
    static int count = 0;   // initialized only on the FIRST call
    ++count;
    std::cout << "count = " << count << '\n';
}

int main() {
    visit();
    visit();
    visit();
    // std::cout << count;  // error: count is still local to visit()
}
```

```output
count = 1
count = 2
count = 3
```

The line `static int count = 0;` is not an assignment that runs every time; it's an initialization
that happens exactly once. The second call skips straight past it.

Static locals are useful for things like ID generators and counting calls:

```cpp run
#include <iostream>
#include <string>

int nextId() {
    static int lastId = 0;
    return ++lastId;
}

std::string makeName(const std::string& prefix) {
    return prefix + "-" + std::to_string(nextId());
}

int main() {
    std::cout << makeName("user") << '\n';
    std::cout << makeName("user") << '\n';
    std::cout << makeName("admin") << '\n';
}
```

```output
user-1
user-2
admin-3
```

Details worth knowing:

- An uninitialized `static int n;` starts at **zero** (static storage is zero-initialized), unlike an
  automatic local. Still, write `= 0` for clarity.
- The initializer can be any expression, even a function call; it runs once.
- Since C++11, that one-time initialization is **thread-safe**.
- A function with a static local has hidden state: calling it twice with the same arguments can give
  different results. That makes it harder to test. Use sparingly.

## Global variables

A variable defined **outside any function** is a **global variable**. It has **static storage
duration** (lives for the whole program, zero-initialized if you don't initialize it) and can be used
by any function below its declaration in the file:

```cpp run
#include <iostream>

int g_score = 0;            // global: visible to everything below

void addPoints(int points) {
    g_score += points;
}

void printScore() {
    std::cout << "score: " << g_score << '\n';
}

int main() {
    addPoints(10);
    addPoints(5);
    printScore();
}
```

```output
score: 15
```

### Why to avoid them

That looks convenient, so why does every style guide say **avoid non-const globals**?

- **Anyone can change them.** When `g_score` has a wrong value, the culprit could be *any* function
  in the program. With parameters, you can see what each function touches from its signature.
- **Hidden dependencies.** `printScore()` looks like it needs no input, but it secretly depends on
  global state. You can't reuse it for a second player.
- **Hard to test.** Every test has to reset the globals first.
- **Initialization order across files is unspecified.** A global in one `.cpp` file that uses a
  global from another may see it before it's initialized (the "static initialization order fiasco").

The fix is usually to pass the data as parameters (by reference when it must be changed):

```cpp run
#include <iostream>

void addPoints(int& score, int points) {
    score += points;
}

void printScore(int score) {
    std::cout << "score: " << score << '\n';
}

int main() {
    int alice = 0;          // now we can have two players
    int bob = 0;
    addPoints(alice, 10);
    addPoints(bob, 3);
    addPoints(alice, 5);
    printScore(alice);
    printScore(bob);
}
```

```output
score: 15
score: 3
```

**Global constants are fine**, since nobody can change them:

```cpp
constexpr double kPi = 3.141592653589793;
constexpr int kMaxPlayers = 4;
```

If you do use a mutable global, a prefix like `g_` makes it stand out.

### Shadowing a global

A local with the same name as a global **shadows** (hides) it inside that scope. `::name` reaches the
global explicitly:

```cpp run
#include <iostream>

int value = 1;              // global

int main() {
    int value = 2;          // local, shadows the global
    std::cout << value << ' ' << ::value << '\n';
}
```

```output
2 1
```

Shadowing is legal but confusing; GCC's `-Wshadow` flag warns about it. Better to just use different names.

## Storage duration overview

| Storage duration | What has it | Created | Destroyed |
| --- | --- | --- | --- |
| **Automatic** | ordinary local variables and parameters | when the definition is reached | at the end of the enclosing block |
| **Static** | globals, `static` locals, `static` class members | before `main` (globals) or on first use (static locals) | when the program ends |
| **Dynamic** | objects created with `new` (and inside containers like `std::vector`) | by `new` | by `delete` (module 08 and later) |
| **Thread** | `thread_local` variables | when the thread starts | when the thread ends |

> **Note:** `static` on a **global** variable or function means something different: "only visible
> inside this `.cpp` file" (*internal linkage*). Same keyword, unrelated meaning. You'll meet it
> again with multi-file programs.

:::quiz
What does this print?

```cpp
int tick() {
    static int n = 10;
    return n++;
}

int main() {
    tick();
    tick();
    std::cout << tick();
}
```

- [ ] `10`
- [x] `12`
- [ ] `13`
- [ ] `11`

`n` starts at 10 and keeps its value: the calls return 10, 11 and 12 (post-increment returns the old value).
:::

:::quiz
Which statements about a `static` local variable are true? (select all that apply)

- [x] It's initialized only once
- [x] It keeps its value between calls
- [ ] Any function can access it by name
- [ ] It's destroyed when the function returns

Its *lifetime* is the whole program, but its *scope* is still just the function.
:::

:::exercise Ticket machine {easy}
Write `int nextTicket()` that returns `1` the first time it's called, `2` the second time, and so on,
using a **static local** variable. Read `n` and print `Ticket #k` for `n` tickets.

**Input:** one integer `n` (`n >= 0`).
**Output:** `n` lines, `Ticket #1`, `Ticket #2`, ...

```cpp starter
#include <iostream>

int nextTicket() {
    int number = 0;
    ++number;
    return number;
}

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cout << "Ticket #" << nextTicket() << '\n';
    }
}
```

```cpp solution
#include <iostream>

int nextTicket() {
    static int number = 0;
    ++number;
    return number;
}

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::cout << "Ticket #" << nextTicket() << '\n';
    }
}
```

```hint
One word fixes it. The local resets on every call; what makes it persist?
```

```stdin
3
```

```expected
Ticket #1
Ticket #2
Ticket #3
```

```stdin
0
```

```expected hidden

```

```stdin
5
```

```expected hidden
Ticket #1
Ticket #2
Ticket #3
Ticket #4
Ticket #5
```

```stdin
1
```

```expected hidden
Ticket #1
```

```checks
must static\s+int :: Use a static local variable.
mustnot nextTicket\s*\(\s*\w :: nextTicket takes no parameters.
```
:::

:::exercise Running average {easy}
Write `double addSample(double x)` that remembers every sample it has been given (using **static
local** variables for the sum and the count) and returns the average of all samples so far. Read
numbers until the end of input and print the running average after each one.

**Input:** zero or more numbers.
**Output:** one line per number: the average so far, with default `std::cout` formatting.

```cpp starter
#include <iostream>

double addSample(double x) {
    return x;
}

int main() {
    double x;
    while (std::cin >> x) {
        std::cout << addSample(x) << '\n';
    }
}
```

```cpp solution
#include <iostream>

double addSample(double x) {
    static double sum = 0.0;
    static int count = 0;
    sum += x;
    ++count;
    return sum / count;
}

int main() {
    double x;
    while (std::cin >> x) {
        std::cout << addSample(x) << '\n';
    }
}
```

```hint
You need two static locals: a running `sum` and a `count`.
```

```stdin
2 4 9
```

```expected
2
3
5
```

```stdin
-1 1 0.5
```

```expected hidden
-1
0
0.166667
```

```stdin
7
```

```expected hidden
7
```

```stdin
10 0 0 0
```

```expected hidden
10
5
3.33333
2.5
```

```stdin
1 2
```

```expected hidden
1
1.5
```

```checks
must static\s+(double|int|long) :: Keep the sum and count in static local variables.
```
:::

:::exercise No globals allowed {medium}
Simulate a bank account **without any global variables**. Keep the balance as a local in `main` and
write two functions that take it **by reference**:

- `void deposit(int& balance, int amount)` adds the amount.
- `bool withdraw(int& balance, int amount)` subtracts it and returns `true`, or returns `false` and
  leaves the balance unchanged if there isn't enough money.

**Input:** lines of the form `deposit N` or `withdraw N`, until the end of input. The balance starts at 0.
**Output:** after each command print `balance: B`, except for a failed withdrawal, which prints
`insufficient funds` instead.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string command;
    int amount;
    while (std::cin >> command >> amount) {
        // TODO
    }
}
```

```cpp solution
#include <iostream>
#include <string>

void deposit(int& balance, int amount) {
    balance += amount;
}

bool withdraw(int& balance, int amount) {
    if (amount > balance) {
        return false;
    }
    balance -= amount;
    return true;
}

int main() {
    int balance = 0;
    std::string command;
    int amount;
    while (std::cin >> command >> amount) {
        if (command == "deposit") {
            deposit(balance, amount);
            std::cout << "balance: " << balance << '\n';
        } else if (withdraw(balance, amount)) {
            std::cout << "balance: " << balance << '\n';
        } else {
            std::cout << "insufficient funds\n";
        }
    }
}
```

```hint
Declare `int balance = 0;` inside `main`, then pass it to both functions as an `int&` parameter.
```

```stdin
deposit 100
withdraw 30
withdraw 80
deposit 5
```

```expected
balance: 100
balance: 70
insufficient funds
balance: 75
```

```stdin
withdraw 1
withdraw 0
```

```expected hidden
insufficient funds
balance: 0
```

```stdin
```

```expected hidden
```

```stdin
deposit 50
withdraw 50
withdraw 1
deposit 0
```

```expected hidden
balance: 50
balance: 0
insufficient funds
balance: 0
```

```checks
mustnot ^(static\s+)?(int|double|long|std::string)\s+\w+\s*(=[^;]*)?; :: Don't use global variables; keep the balance in main.
must void\s+deposit\s*\(\s*int\s*&\s*\w+\s*,\s*int :: Write void deposit(int& balance, int amount).
must bool\s+withdraw\s*\(\s*int\s*&\s*\w+\s*,\s*int :: Write bool withdraw(int& balance, int amount).
```
:::
