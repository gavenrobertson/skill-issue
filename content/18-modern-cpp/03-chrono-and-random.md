---
title: Time & Randomness
summary: "<chrono> durations, time points, clocks, and literals, measuring elapsed time, calendar dates; <random> engines, distributions, seeding, and why rand() is obsolete."
---

## Part 1: `<chrono>`

Time is full of traps: is that `5` seconds or milliseconds? Did someone add minutes to hours? C++'s
`<chrono>` library makes **units part of the type**, so the compiler catches unit mistakes and does
conversions for you. Everything lives in namespace `std::chrono`.

Three core concepts:

| Concept | What it is | Example |
| --- | --- | --- |
| **duration** | an amount of time: a count of ticks of some unit | `std::chrono::seconds(90)` |
| **clock** | a source of the current time | `std::chrono::steady_clock` |
| **time_point** | a moment in time, relative to a clock's starting point (epoch) | `steady_clock::now()` |

### Durations

A duration is a number plus a unit. The standard provides the common units as types:

```cpp run
#include <chrono>
#include <iostream>

int main() {
    std::chrono::seconds s{90};
    std::chrono::milliseconds ms{1500};
    std::chrono::minutes m{2};
    std::chrono::hours h{1};

    std::cout << s.count() << " seconds\n";          // .count() gives the raw number
    std::cout << ms.count() << " milliseconds\n";

    auto total = h + m + s;                          // mixed units: result uses the finest unit
    std::cout << "total: " << total.count() << " seconds\n";

    std::chrono::milliseconds converted = s;         // coarse -> fine: implicit, never loses data
    std::cout << "90s = " << converted.count() << "ms\n";

    std::cout << (std::chrono::seconds{60} == std::chrono::minutes{1}) << '\n';   // compares values
}
```

```output
90 seconds
1500 milliseconds
total: 3810 seconds
90s = 90000ms
1
```

Available units: `nanoseconds`, `microseconds`, `milliseconds`, `seconds`, `minutes`, `hours`, and
since C++20 `days`, `weeks`, `months`, `years`. You can also make your own with
`std::chrono::duration<Rep, Ratio>`; for example `std::chrono::duration<double>` is "seconds stored as a
`double`", which is handy for fractional results.

### Converting: `duration_cast`

Converting to a **coarser** unit could lose information (90 seconds is 1.5 minutes), so it isn't
implicit. You must say how you want it done:

```cpp compile-error
#include <chrono>

int main() {
    std::chrono::seconds s{90};
    std::chrono::minutes m = s;   // error: conversion from seconds to minutes would truncate
}
```

```cpp run
#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono;
    seconds s{150};

    std::cout << duration_cast<minutes>(s).count() << '\n';   // truncates toward zero: 2
    std::cout << floor<minutes>(s).count() << '\n';           // rounds down: 2
    std::cout << ceil<minutes>(s).count() << '\n';            // rounds up: 3
    std::cout << round<minutes>(s).count() << '\n';           // to nearest (ties to even): 2

    duration<double, std::ratio<60>> fractionalMinutes = s;   // floating point: implicit, no loss
    std::cout << fractionalMinutes.count() << '\n';

    // Breaking a duration into parts
    seconds total{3725};
    auto hrs = duration_cast<hours>(total);
    auto mins = duration_cast<minutes>(total - hrs);
    auto secs = total - hrs - mins;
    std::cout << hrs.count() << "h " << mins.count() << "m " << secs.count() << "s\n";
}
```

```output
2
2
3
2
2.5
1h 2m 5s
```

### Chrono literals

With `using namespace std::chrono_literals;` (an accepted using-directive: this namespace exists to be
pulled in), you can write durations directly:

```cpp run
#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono_literals;

    auto timeout = 250ms;
    auto meeting = 1h + 30min;
    auto tick = 16.6ms;                       // floating-point literal -> duration<double, milli>

    std::cout << timeout.count() << ' ' << meeting.count() << ' ' << tick.count() << '\n';
    std::cout << meeting << ' ' << timeout << '\n';   // C++20: durations print with their unit
}
```

```output
250 90 16.6
90min 250ms
```

| Literal | Type |
| --- | --- |
| `2h` | `hours` |
| `30min` | `minutes` |
| `10s` | `seconds` |
| `250ms` | `milliseconds` |
| `5us` | `microseconds` |
| `100ns` | `nanoseconds` |

(`d` and `y` are taken by the calendar: `15d` is a day of the month, `2024y` a year.)

### Clocks and time points

| Clock | Meaning | Use it for |
| --- | --- | --- |
| `std::chrono::system_clock` | wall-clock time, like your computer's clock; can jump (time sync, user changes it) | timestamps, dates |
| `std::chrono::steady_clock` | never goes backwards; ticks at a steady rate | **measuring elapsed time**, timeouts |
| `std::chrono::high_resolution_clock` | the finest clock available (often an alias for one of the others) | rarely needed; prefer `steady_clock` |

`Clock::now()` returns a `time_point`. Subtracting two time points gives a duration; adding a duration
to a time point gives a later time point.

### Measuring elapsed time

The standard pattern for timing code:

```cpp run
#include <chrono>
#include <iostream>
#include <thread>

long long work() {
    long long sum = 0;
    for (int i = 0; i < 1'000'000; ++i) sum += i % 7;
    return sum;
}

int main() {
    using namespace std::chrono;
    using namespace std::chrono_literals;

    auto start = steady_clock::now();
    long long result = work();
    std::this_thread::sleep_for(20ms);       // pause this thread for (at least) 20 ms
    auto end = steady_clock::now();

    auto elapsed = end - start;              // a duration in the clock's native unit
    std::cout << "result " << result << '\n';
    std::cout << "took " << duration_cast<milliseconds>(elapsed).count() << " ms\n";
    std::cout << "took " << duration<double>(elapsed).count() << " s\n";
}
```

The times printed differ on every run, which is exactly why this example has no output shown, and why
exercises never put timings in their expected output.

> **Tip:** When benchmarking, compile with optimizations (`-O2`), run several times, and make sure the
> result is used (printing `result` here), or the optimizer may delete the work entirely.

### Calendar dates (C++20)

C++20 added dates to `<chrono>`. They're computed exactly, with no time zone involved:

```cpp run
#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono;

    year_month_day launch = 2024y / March / 15;
    std::cout << launch << " was a " << weekday{sys_days{launch}} << '\n';

    auto span = sys_days{2025y / January / 1} - sys_days{2024y / January / 1};
    std::cout << "2024 had " << span.count() << " days\n";

    year_month_day later = sys_days{launch} + days{30};
    std::cout << "30 days later: " << later << '\n';

    std::cout << std::boolalpha << "2100 is leap: " << year{2100}.is_leap() << '\n';

    hh_mm_ss clock{3725s};
    std::cout << "3725s = " << clock << '\n';
}
```

```output
2024-03-15 was a Fri
2024 had 366 days
30 days later: 2024-04-14
2100 is leap: false
3725s = 01:02:05
```

C++20 also specifies time zones (`std::chrono::zoned_time`, `current_zone()`); library support for them
arrived later than the rest of `<chrono>` (GCC 14).

## Part 2: `<random>`

### Why not `rand()`?

C's `std::rand()` (from `<cstdlib>`) is still in tutorials, but it has real problems:

- Its quality is **unspecified**; many implementations produce poor sequences.
- `RAND_MAX` can be as small as 32767.
- `rand() % 6` is **biased**: unless `RAND_MAX + 1` is a multiple of 6, small results are slightly more likely.
- It has one hidden global state: not thread-safe, and you can't have independent streams.

C++11's `<random>` separates the problem into two parts:

- An **engine** produces raw random bits (deterministically, from a **seed**).
- A **distribution** turns those bits into numbers with the shape you want (uniform in a range, normal, ...),
  correctly and without bias.

### Engines and seeds

`std::mt19937` (the 32-bit **Mersenne Twister**) is the standard general-purpose engine.
`std::mt19937_64` is the 64-bit version. Engines are **pseudo-random**: the same seed always produces
the same sequence. That's a feature: it makes simulations, tests, and games reproducible.

The standard specifies the Mersenne Twister's algorithm exactly, so its **raw output** for a given seed is
the same on every compiler and platform:

```cpp run
#include <iostream>
#include <random>

int main() {
    std::mt19937 gen(42);                 // seeded with 42
    std::cout << gen() << ' ' << gen() << ' ' << gen() << '\n';

    std::mt19937 again(42);               // same seed -> same sequence
    std::cout << again() << '\n';

    std::mt19937 byDefault;               // default seed is 5489
    byDefault.discard(9999);              // skip 9999 values
    std::cout << byDefault() << '\n';     // the 10000th value; the standard says it must be 4123659995

    std::cout << "range: " << std::mt19937::min() << " to " << std::mt19937::max() << '\n';
}
```

```output
1608637542 3421126067 4083286876
1608637542
4123659995
range: 0 to 4294967295
```

### Distributions

Never use `gen() % n`. Pass the engine to a **distribution**:

| Distribution | Produces |
| --- | --- |
| `std::uniform_int_distribution<int> d(a, b)` | integers in **[a, b]**, both ends included, all equally likely |
| `std::uniform_real_distribution<double> d(a, b)` | reals in **[a, b)** |
| `std::normal_distribution<double> d(mean, stddev)` | bell curve values |
| `std::bernoulli_distribution d(p)` | `true` with probability `p` |
| `std::discrete_distribution<int> d{w0, w1, ...}` | index `i` with probability proportional to `wi` |
| `std::poisson_distribution`, `std::exponential_distribution`, ... | and more |

```cpp run
#include <iostream>
#include <random>

int main() {
    std::mt19937 gen(2024);

    std::uniform_int_distribution<int> die(1, 6);
    std::uniform_real_distribution<double> unit(0.0, 1.0);
    std::normal_distribution<double> height(170.0, 10.0);   // mean 170, standard deviation 10
    std::bernoulli_distribution coin(0.5);

    std::cout << "dice:";
    for (int i = 0; i < 5; ++i) std::cout << ' ' << die(gen);
    std::cout << "\nreal: " << unit(gen) << "\nheight: " << height(gen)
              << "\ncoin: " << (coin(gen) ? "heads" : "tails") << '\n';
}
```

No output is shown for this one on purpose. The engine's raw bits are fully specified, but **how a
distribution turns bits into values is implementation-defined**: GCC, Clang, and MSVC can print
different dice rolls for the same seed. A fixed seed makes a program reproducible **with one standard
library**, not across all of them. (That's also why exercises here never test distribution values.)

Distributions are cheap objects; engines are bigger (`std::mt19937` holds about 2.5 KB of state) and
slower to seed. So **create the engine once and reuse it**. Don't create a new engine inside a function
that's called repeatedly.

```cpp
int rollDie(std::mt19937& gen) {                         // pass the engine by reference
    std::uniform_int_distribution<int> die(1, 6);        // cheap to create
    return die(gen);
}
```

### Seeding with `std::random_device`

A fixed seed gives the same "random" sequence every run: great for tests, bad for a game. For
different results each run, seed from `std::random_device`, which asks the operating system for
**non-deterministic** random numbers (on mainstream platforms):

```cpp
std::random_device rd;          // non-deterministic source (slow; use it only for seeding)
std::mt19937 gen(rd());         // seed the fast engine once

// Even better seeding for mt19937's large state:
std::seed_seq seq{rd(), rd(), rd(), rd()};
std::mt19937 gen2(seq);
```

A common, practical setup: seed from `random_device` by default, but allow a fixed seed (from a command-
line flag, say) to reproduce a bug.

> **Warning:** None of these generators is suitable for **security** (passwords, tokens, keys). The
> Mersenne Twister's future output can be predicted after observing some of it. Use your operating
> system's cryptographic API or a crypto library for that.

### Shuffling and picking

```cpp
std::vector<int> deck(52);
std::iota(deck.begin(), deck.end(), 0);
std::shuffle(deck.begin(), deck.end(), gen);       // random permutation (C++ never had a good random_shuffle)

std::vector<int> hand;
std::sample(deck.begin(), deck.end(), std::back_inserter(hand), 5, gen);   // pick 5 without repeats
```

Like distributions, the exact permutation `std::shuffle` produces is implementation-specific.

:::quiz
Which conversion compiles **without** a cast?

- [x] `std::chrono::milliseconds ms = std::chrono::seconds{3};`
- [ ] `std::chrono::seconds s = std::chrono::milliseconds{3000};`
- [ ] `std::chrono::hours h = std::chrono::minutes{120};`
- [ ] None of them

Converting to a **finer** unit never loses information, so it's implicit. Converting to a coarser
integer unit needs `duration_cast` (or `floor`/`ceil`/`round`).
:::

:::quiz
Which clock should you use to measure how long a function takes?

- [ ] `system_clock`
- [x] `steady_clock`
- [ ] `rand()`
- [ ] `std::chrono::years`

`steady_clock` is monotonic: it never jumps backwards when the wall-clock time is adjusted.
:::

:::quiz
Why is `rand() % 6 + 1` a poor die roll? (select all that apply)

- [x] `% 6` makes some results slightly more likely than others
- [x] `rand()`'s quality and range are not guaranteed
- [ ] `rand()` can return negative numbers
- [ ] It always returns the same number

Modulo bias plus an unspecified, often weak generator. Use an engine like `std::mt19937` with
`std::uniform_int_distribution<int>(1, 6)`.
:::

:::exercise Split a duration {easy}
Read a number of seconds (a non-negative integer that fits in `long long`) into a
`std::chrono::seconds`. Using `std::chrono::duration_cast`, print three lines:

```
<h>h <m>m <s>s
minutes (rounded down): <total whole minutes>
milliseconds: <total milliseconds>
```

For example `3725` gives `1h 2m 5s`, `minutes (rounded down): 62`, `milliseconds: 3725000`.

```cpp starter
#include <chrono>
#include <iostream>

int main() {
    long long n;
    std::cin >> n;
    std::chrono::seconds total{n};
    std::cout << total.count() / 3600 << "h\n";
}
```

```cpp solution
#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono;
    long long n;
    std::cin >> n;
    seconds total{n};

    auto h = duration_cast<hours>(total);
    auto m = duration_cast<minutes>(total - h);
    auto s = total - h - m;
    std::cout << h.count() << "h " << m.count() << "m " << s.count() << "s\n";
    std::cout << "minutes (rounded down): " << duration_cast<minutes>(total).count() << '\n';
    milliseconds ms = total;
    std::cout << "milliseconds: " << ms.count() << '\n';
}
```

```hint
`auto h = std::chrono::duration_cast<std::chrono::hours>(total);` then subtract `h` from `total` before
extracting the minutes.
```

```hint
Seconds to milliseconds is a conversion to a finer unit, so a plain assignment works.
```

```stdin
3725
```

```expected
1h 2m 5s
minutes (rounded down): 62
milliseconds: 3725000
```

```stdin
0
```

```expected
0h 0m 0s
minutes (rounded down): 0
milliseconds: 0
```

```stdin
359999
```

```expected hidden
99h 59m 59s
minutes (rounded down): 5999
milliseconds: 359999000
```

```stdin
3599
```

```expected hidden
0h 59m 59s
minutes (rounded down): 59
milliseconds: 3599000
```

```stdin
86400
```

```expected hidden
24h 0m 0s
minutes (rounded down): 1440
milliseconds: 86400000
```

```checks
must duration_cast :: Use std::chrono::duration_cast.
must (std::)?chrono::|using\s+namespace\s+std::chrono :: Use the std::chrono types.
```
:::

:::exercise Time budget {medium}
Read duration tokens until the end of input. Each token is a non-negative integer followed by a unit:
`h`, `min`, `s`, or `ms` (for example `2h`, `15min`, `90s`, `500ms`). Add them all up as a
`std::chrono::milliseconds` and print the total as `HH:MM:SS.mmm` (hours with at least two digits,
zero-padded fields).

If a token has an unknown unit or no number, print `bad token: <token>` and skip it. The total is
printed last.

```cpp starter
#include <chrono>
#include <iomanip>
#include <iostream>
#include <string>

int main() {
    std::string token;
    while (std::cin >> token) {
    }
    std::cout << "00:00:00.000\n";
}
```

```cpp solution
#include <chrono>
#include <iomanip>
#include <iostream>
#include <string>

int main() {
    using namespace std::chrono;
    milliseconds total{0};
    std::string token;
    while (std::cin >> token) {
        std::size_t i = 0;
        while (i < token.size() && token[i] >= '0' && token[i] <= '9') ++i;
        std::string unit = token.substr(i);
        if (i == 0) {
            std::cout << "bad token: " << token << '\n';
            continue;
        }
        long long value = std::stoll(token.substr(0, i));
        if (unit == "h") total += hours{value};
        else if (unit == "min") total += minutes{value};
        else if (unit == "s") total += seconds{value};
        else if (unit == "ms") total += milliseconds{value};
        else std::cout << "bad token: " << token << '\n';
    }

    auto h = duration_cast<hours>(total);
    auto m = duration_cast<minutes>(total - h);
    auto s = duration_cast<seconds>(total - h - m);
    auto ms = total - h - m - s;
    std::cout << std::setfill('0') << std::setw(2) << h.count() << ':'
              << std::setw(2) << m.count() << ':'
              << std::setw(2) << s.count() << '.'
              << std::setw(3) << ms.count() << '\n';
}
```

```hint
Split each token into its leading digits and the rest (the unit). Then `total += std::chrono::minutes{value};`
etc.: adding a coarser duration to `milliseconds` converts automatically.
```

```hint
Break the total into hours, minutes, seconds, and milliseconds with `duration_cast`, subtracting each part
as you go, and print with `std::setfill('0')` and `std::setw`.
```

```stdin
1h 30min 90s 500ms
```

```expected
01:31:30.500
```

```stdin
2days 45 999ms 1ms 26h
```

```expected hidden
bad token: 2days
bad token: 45
26:00:01.000
```

```stdin
ms -5s 1H 0h 59min 60s 1000ms 999ms 1ms
```

```expected hidden
bad token: ms
bad token: -5s
bad token: 1H
01:00:02.000
```

```stdin
100h 0ms
```

```expected hidden
100:00:00.000
```

```expected
00:00:00.000
```

```checks
must (std::)?chrono::|using\s+namespace\s+std::chrono :: Use std::chrono durations.
must milliseconds :: Accumulate the total as std::chrono::milliseconds.
```
:::

:::exercise Mersenne Twister by the numbers {easy}
Read a seed (an unsigned 32-bit integer) and a position `k` (1 ≤ k ≤ 1,000,000). Create a
`std::mt19937` with that seed and print:

```
first: <1st> <2nd> <3rd>
#<k>: <the k-th output of a fresh engine with the same seed>
```

Because the Mersenne Twister's algorithm is fixed by the standard, these numbers are the same
everywhere. (Use `.discard(k - 1)` on a fresh engine to skip ahead.)

```cpp starter
#include <iostream>
#include <random>

int main() {
    unsigned seed;
    long long k;
    std::cin >> seed >> k;
    std::cout << "first: 0 0 0\n";
}
```

```cpp solution
#include <iostream>
#include <random>

int main() {
    unsigned seed;
    long long k;
    std::cin >> seed >> k;

    std::mt19937 gen(seed);
    unsigned a = gen();
    unsigned b = gen();
    unsigned c = gen();
    std::cout << "first: " << a << ' ' << b << ' ' << c << '\n';

    std::mt19937 fresh(seed);
    fresh.discard(k - 1);
    std::cout << '#' << k << ": " << fresh() << '\n';
}
```

```hint
Call `gen()` three times, storing each result in its own variable, then print them.
```

```stdin
5489 10000
```

```expected
first: 3499211612 581869302 3890346734
#10000: 4123659995
```

```stdin
42 1
```

```expected hidden
first: 1608637542 3421126067 4083286876
#1: 1608637542
```

```stdin
0 2
```

```expected hidden
first: 2357136044 2546248239 3071714933
#2: 2546248239
```

```checks
must std::mt19937\b :: Use std::mt19937.
must \.discard\s*\( :: Skip ahead with .discard().
```
:::

:::exercise Reproducible rolls {easy}
Write `int rollDie(std::mt19937& gen)` that returns a fair die roll (1 to 6) using
`std::uniform_int_distribution<int>`.

Read a seed and a count `n`. Roll `n` dice with an engine seeded with `seed` and store the results.
Then roll `n` dice again with a **second, freshly seeded** engine (same seed). Print:

```
rolls: <n>
in range: <yes if every roll was between 1 and 6, else no>
reproducible: <yes if both sequences are identical, else no>
```

(The actual roll values depend on your standard library, so they aren't printed.)

```cpp starter
#include <iostream>
#include <random>
#include <vector>

int rollDie(std::mt19937& gen) {
    return static_cast<int>(gen());
}

int main() {
    unsigned seed;
    int n;
    std::cin >> seed >> n;
}
```

```cpp solution
#include <iostream>
#include <random>
#include <vector>

int rollDie(std::mt19937& gen) {
    std::uniform_int_distribution<int> die(1, 6);
    return die(gen);
}

std::vector<int> rollMany(unsigned seed, int n) {
    std::mt19937 gen(seed);
    std::vector<int> rolls;
    for (int i = 0; i < n; ++i) rolls.push_back(rollDie(gen));
    return rolls;
}

int main() {
    unsigned seed;
    int n;
    std::cin >> seed >> n;
    std::vector<int> first = rollMany(seed, n);
    std::vector<int> second = rollMany(seed, n);

    bool inRange = true;
    for (int r : first) {
        if (r < 1 || r > 6) inRange = false;
    }
    std::cout << "rolls: " << first.size() << '\n';
    std::cout << "in range: " << (inRange ? "yes" : "no") << '\n';
    std::cout << "reproducible: " << (first == second ? "yes" : "no") << '\n';
}
```

```hint
Create the distribution inside `rollDie` (it's cheap) but take the engine by reference, so each call
advances the same engine.
```

```hint
Two `std::vector<int>`s can be compared with `==`.
```

```stdin
7 20
```

```expected
rolls: 20
in range: yes
reproducible: yes
```

```stdin
123456 1000
```

```expected hidden
rolls: 1000
in range: yes
reproducible: yes
```

```stdin
1 0
```

```expected
rolls: 0
in range: yes
reproducible: yes
```

```checks
must uniform_int_distribution\s*<\s*int\s*> :: Use std::uniform_int_distribution<int>.
must std::mt19937\s*& :: Pass the engine by reference.
mustnot \brand\s*\( :: Don't use rand().
mustnot %\s*6 :: Let the distribution handle the range instead of % 6.
```
:::
