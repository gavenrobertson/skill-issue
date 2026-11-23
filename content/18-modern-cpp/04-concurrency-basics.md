---
title: Concurrency Basics
summary: Run code in parallel with std::thread and std::jthread, pass arguments safely, avoid data races with mutexes, locks, and atomics, and get results back with std::async and futures.
---

## Why threads?

A modern CPU has several **cores**, each able to run code at the same time. A normal program uses one.
**Concurrency** lets a program do several things at once: crunch numbers on all cores, keep a user
interface responsive while saving a file, or serve many network clients.

A **thread** is an independent sequence of execution inside your program. All threads share the same
memory (globals, the heap, any object they can reach), which is what makes threads powerful and also
what makes them dangerous.

> **Note:** On your own machine, compile threaded programs with `-pthread` on Linux:
> `g++ -std=c++20 -pthread main.cpp`. This site does that for you.

The examples in this lesson are written so their output is **deterministic**: threads compute results
into separate variables, and only one thread prints at a time (usually `main`, after the others have
finished). When several threads print at once, the order of their lines changes from run to run.

## `std::thread`: starting and joining

`std::thread` (from `<thread>`) starts running a function as soon as it's constructed. Anything callable
works: a function, a lambda, a function object.

```cpp run
#include <iostream>
#include <thread>

void countTo(int n, int& out) {
    int total = 0;
    for (int i = 1; i <= n; ++i) total += i;
    out = total;
}

int main() {
    int a = 0;
    int b = 0;

    std::thread t1(countTo, 100, std::ref(a));        // a function plus its arguments
    std::thread t2([&b] { countTo(1000, b); });       // a lambda

    // ... main could do other work here, at the same time ...

    t1.join();                                        // wait for t1 to finish
    t2.join();                                        // wait for t2 to finish

    std::cout << "a = " << a << ", b = " << b << '\n';  // safe: both threads are done
}
```

```output
a = 5050, b = 500500
```

`join()` blocks until the thread finishes. **Every `std::thread` must be joined (or detached) before it's
destroyed**; if a joinable `std::thread`'s destructor runs, the program calls `std::terminate` and
crashes:

```cpp
void oops() {
    std::thread t([] { /* work */ });
}   // t destroyed while still joinable: std::terminate()
```

The alternative to joining is `t.detach()`: the thread runs on independently and you can never wait
for it. That's rarely what you want, since a detached thread that's still running when `main` returns is
killed mid-work, and it must not touch any local variables that may have been destroyed. Prefer `join`,
or better, `std::jthread` (below).

Useful extras:

```cpp
t.joinable();                               // true until joined or detached
std::this_thread::get_id();                 // an id for the current thread
std::this_thread::sleep_for(100ms);         // pause the current thread
std::thread::hardware_concurrency();        // a hint: how many threads can truly run in parallel
```

### Passing arguments: copies by default, `std::ref` for references

Arguments to the `std::thread` constructor are **copied** (or moved) into the new thread, even if the
function takes a reference. That's a safety measure: the original might not live as long as the
thread. To really pass a reference, wrap it in `std::ref` (or `std::cref` for `const&`), and make sure
the object outlives the thread:

```cpp compile-error
#include <thread>

void fill(int& out) { out = 42; }

int main() {
    int value = 0;
    std::thread t(fill, value);   // error: the thread would bind int& to a copy
    t.join();
}
```

The fix is `std::thread t(fill, std::ref(value));`. With a lambda, you choose with the capture list
instead: `[&value]` captures by reference, `[value]` by copy.

## Data races

When two threads access the same memory location, at least one of them **writes**, and nothing orders
the accesses, you have a **data race**, which is **undefined behavior**:

```cpp
int counter = 0;
auto work = [&counter] { for (int i = 0; i < 100000; ++i) ++counter; };
std::thread t1(work);
std::thread t2(work);
t1.join();
t2.join();
std::cout << counter;   // UB. In practice often something like 117482, different every run
```

`++counter` is really three steps (read, add, write). Two threads can both read 5, both compute 6, and
both write 6: one increment is lost. Worse, as UB, the compiler is allowed to optimize assuming it never
happens. Every shared, mutable variable needs **synchronization**: a mutex or an atomic.

## `std::mutex` and locks

A **mutex** ("mutual exclusion") is a lock that only one thread can hold at a time. Code between lock
and unlock is a **critical section**: only one thread runs it at once.

Never call `lock()` and `unlock()` by hand (an exception or early `return` would leave it locked forever).
Use an RAII lock object, which unlocks in its destructor:

```cpp run
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

int main() {
    int counter = 0;
    std::mutex m;

    auto work = [&] {
        for (int i = 0; i < 100000; ++i) {
            std::lock_guard<std::mutex> lock(m);   // locks m here...
            ++counter;
        }                                          // ...unlocks here, every iteration
    };

    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i) threads.emplace_back(work);
    for (auto& t : threads) t.join();

    std::cout << "counter = " << counter << '\n';
}
```

```output
counter = 400000
```

The lock types, from simplest to most flexible:

| Lock | Use |
| --- | --- |
| `std::lock_guard<std::mutex> lk(m);` | lock one mutex for the rest of the scope |
| `std::scoped_lock lk(m1, m2, ...);` (C++17) | lock **one or more** mutexes at once, without deadlock. A good default even for one |
| `std::unique_lock<std::mutex> lk(m);` | like `lock_guard`, but can `unlock()`/`lock()` again, be created unlocked (`std::defer_lock`), be moved, and works with condition variables |

### Deadlock and `std::scoped_lock`

A **deadlock** happens when thread A holds mutex 1 and waits for mutex 2, while thread B holds mutex 2
and waits for mutex 1. Both wait forever. Transferring money between two accounts is the classic case:
`transfer(a, b)` locks a then b, while `transfer(b, a)` locks b then a. `std::scoped_lock` locks all its
mutexes using a deadlock-avoidance algorithm, so the order you list them in doesn't matter:

```cpp run
#include <iostream>
#include <mutex>
#include <thread>

struct Account {
    std::mutex m;
    int balance = 0;
};

void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lock(from.m, to.m);   // locks both, deadlock-free
    from.balance -= amount;
    to.balance += amount;
}

int main() {
    Account alice;
    Account bob;
    alice.balance = 1000;
    bob.balance = 1000;

    std::thread t1([&] { for (int i = 0; i < 1000; ++i) transfer(alice, bob, 1); });
    std::thread t2([&] { for (int i = 0; i < 1000; ++i) transfer(bob, alice, 2); });
    t1.join();
    t2.join();

    std::cout << "alice " << alice.balance << ", bob " << bob.balance << '\n';
}
```

```output
alice 2000, bob 0
```

### `std::unique_lock` and condition variables

A `std::condition_variable` lets a thread **sleep until** another thread tells it something changed.
It needs a `std::unique_lock`, because waiting temporarily unlocks the mutex. Here's a tiny
producer/consumer queue:

```cpp run
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <queue>
#include <thread>

int main() {
    std::queue<int> jobs;
    std::mutex m;
    std::condition_variable cv;
    bool done = false;

    std::thread consumer([&] {
        while (true) {
            std::unique_lock<std::mutex> lock(m);
            cv.wait(lock, [&] { return !jobs.empty() || done; });   // sleeps until notified AND the condition holds
            if (jobs.empty()) break;                                // done and nothing left
            int job = jobs.front();
            jobs.pop();
            lock.unlock();                                          // don't hold the lock while working
            std::cout << "processed job " << job << '\n';           // only this thread prints
        }
    });

    for (int i = 1; i <= 3; ++i) {
        {
            std::lock_guard<std::mutex> lock(m);
            jobs.push(i * 10);
        }
        cv.notify_one();                                            // wake the consumer
    }
    {
        std::lock_guard<std::mutex> lock(m);
        done = true;
    }
    cv.notify_one();
    consumer.join();
    std::cout << "all jobs done\n";
}
```

```output
processed job 10
processed job 20
processed job 30
all jobs done
```

Always wait **with a predicate** (the lambda). Threads can wake up spuriously, and the predicate is
rechecked every time.

## `std::atomic`

For a single shared variable like a counter or a flag, a mutex is overkill. `std::atomic<T>` (from
`<atomic>`) makes individual operations on the variable indivisible, usually with a single CPU
instruction:

```cpp run
#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    std::atomic<int> hits{0};
    std::atomic<bool> sawLarge{false};

    std::vector<std::thread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&, t] {
            for (int i = 0; i < 50000; ++i) {
                ++hits;                                   // atomic increment
            }
            if (t == 3) sawLarge.store(true);             // atomic write
        });
    }
    for (auto& th : threads) th.join();

    std::cout << "hits = " << hits.load() << ", flag = " << sawLarge << '\n';
    std::cout << "fetch_add returned " << hits.fetch_add(5) << ", now " << hits << '\n';
}
```

```output
hits = 200000, flag = 1
fetch_add returned 200000, now 200005
```

Atomics are great for counters, flags, and simple statistics. They don't help when **several**
variables must change together consistently (like the two balances above); that needs a mutex.

> **Pitfall:** `hits = hits + 1;` on an atomic is **two** atomic operations (a load, then a store), and
> another thread can sneak in between. Use `++hits`, `hits += 1`, or `hits.fetch_add(1)`.

## `std::async` and futures: tasks that return values

Threads don't return values; you have to arrange a place for the result. `std::async` (from
`<future>`) runs a function and gives you a `std::future<T>`: a handle to a result that will be ready
later. `.get()` waits for it and returns it (or rethrows the exception the task threw).

```cpp run
#include <future>
#include <iostream>
#include <numeric>
#include <stdexcept>
#include <vector>

long long sumRange(const std::vector<int>& v, std::size_t begin, std::size_t end) {
    return std::accumulate(v.begin() + begin, v.begin() + end, 0LL);
}

int checkedSqrt(int x) {
    if (x < 0) throw std::invalid_argument("negative input");
    int r = 0;
    while ((r + 1) * (r + 1) <= x) ++r;
    return r;
}

int main() {
    std::vector<int> data(1000);
    std::iota(data.begin(), data.end(), 1);    // 1, 2, ..., 1000

    // std::launch::async: run on a new thread right away
    std::future<long long> firstHalf = std::async(std::launch::async, sumRange, std::cref(data), 0, 500);
    std::future<long long> secondHalf = std::async(std::launch::async, sumRange, std::cref(data), 500, 1000);

    long long total = firstHalf.get() + secondHalf.get();   // waits for both
    std::cout << "total = " << total << '\n';

    auto bad = std::async(std::launch::async, checkedSqrt, -4);
    try {
        bad.get();                                           // the task's exception is rethrown here
    } catch (const std::invalid_argument& e) {
        std::cout << "task failed: " << e.what() << '\n';
    }
}
```

```output
total = 500500
task failed: negative input
```

Notes:

- Pass `std::launch::async` to guarantee a new thread. Without it, the implementation may defer the
  call until `.get()`, running it on the calling thread.
- `.get()` can be called only once. Use `std::shared_future` if several threads need the result.
- A `std::future` from `std::async` **waits in its destructor**, so `std::async(...);` without keeping the
  future runs synchronously, a common surprise.
- `std::promise<T>` is the low-level building block: one thread calls `promise.set_value(x)`, and another
  waits on the matching `promise.get_future()`.

## `std::jthread` (C++20): the thread you should use

`std::jthread` ("joining thread") fixes `std::thread`'s sharp edge: its destructor **joins
automatically**. It also supports **cooperative cancellation**: if the function's first parameter is a
`std::stop_token`, the thread can check whether someone requested it to stop.

```cpp run
#include <chrono>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    using namespace std::chrono_literals;

    std::vector<int> results(3);
    {
        std::vector<std::jthread> workers;
        for (int i = 0; i < 3; ++i) {
            workers.emplace_back([&results, i] { results[i] = (i + 1) * 100; });   // each writes its own slot
        }
    }   // all three joined automatically here

    for (int r : results) std::cout << r << ' ';
    std::cout << '\n';

    std::jthread ticker([](std::stop_token stop) {
        while (!stop.stop_requested()) {        // cooperative: the thread checks the token
            std::this_thread::sleep_for(1ms);
        }
    });
    ticker.request_stop();                      // ask it to finish
    ticker.join();                              // (the destructor would also do this)
    std::cout << "ticker stopped cleanly\n";
}
```

```output
100 200 300
ticker stopped cleanly
```

Writing to **different** elements of the same vector from different threads is fine: they're different
memory locations. Resizing the vector while threads use it would not be.

## Guidelines

- Prefer **higher-level tools**: `std::async`/futures for "compute this in the background", parallel
  algorithms (`std::sort(std::execution::par, ...)`), or a thread pool library, before raw threads.
- **Share as little as possible.** Give each thread its own data and combine results at the end.
- Protect everything that's shared and mutable with a mutex, or make it atomic.
- Keep critical sections short; never call unknown code (callbacks) while holding a lock.
- Use `std::scoped_lock` for multiple mutexes, and always the RAII lock types.
- Test with **ThreadSanitizer** (`-fsanitize=thread`): data races often don't show up in normal runs.

:::quiz
What happens if a `std::thread` object is destroyed while it is still joinable?

- [ ] It joins automatically
- [ ] It detaches automatically
- [x] The program calls `std::terminate`
- [ ] Nothing

That's `std::thread`'s rule. `std::jthread` joins automatically in its destructor instead.
:::

:::quiz
Two threads each run `++count;` 1000 times on a shared plain `int count = 0;`. What's the result?

- [ ] Always 2000
- [ ] Always 1000
- [x] Undefined behavior: a data race
- [ ] A compile error

Unsynchronized writes to the same variable from two threads are a data race. Use `std::atomic<int>`
or a mutex.
:::

:::quiz
You need to lock two mutexes at once without risking deadlock. What should you use?

- [ ] Two `std::lock_guard`s, in alphabetical order of variable name
- [x] `std::scoped_lock lock(m1, m2);`
- [ ] `std::atomic<std::mutex>`
- [ ] `m1.lock(); m2.lock();`

`std::scoped_lock` acquires all its mutexes with a deadlock-avoidance algorithm and releases them via RAII.
:::

:::exercise Parallel sum
Read `n` and then `n` integers. Split the numbers into **4 contiguous chunks** (chunk `i` covers
indices `i*n/4` up to, but not including, `(i+1)*n/4`) and sum each chunk in its own `std::thread`,
writing the result into `partial[i]`. Join all threads, then print each partial sum and the total:

```
chunk 0: <sum>
chunk 1: <sum>
chunk 2: <sum>
chunk 3: <sum>
total: <sum>
```

Use `long long` for the sums. Empty chunks have sum 0.

```cpp starter
#include <iostream>
#include <thread>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;
    std::vector<long long> partial(4, 0);
    // start 4 threads, join them, print the results
}
```

```cpp solution
#include <iostream>
#include <thread>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;
    std::vector<long long> partial(4, 0);

    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back([&v, &partial, i, n] {
            long long sum = 0;
            for (int k = i * n / 4; k < (i + 1) * n / 4; ++k) sum += v[k];
            partial[i] = sum;
        });
    }
    for (auto& t : threads) t.join();

    long long total = 0;
    for (int i = 0; i < 4; ++i) {
        std::cout << "chunk " << i << ": " << partial[i] << '\n';
        total += partial[i];
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
A lambda capturing `i` **by value** and the vectors by reference works well:
`threads.emplace_back([&v, &partial, i, n] { ... });`
```

```hint
Each thread writes only its own `partial[i]`, so there's no data race. Print only after **all** joins.
```

```stdin
8
1 2 3 4 5 6 7 8
```

```expected
chunk 0: 3
chunk 1: 7
chunk 2: 11
chunk 3: 15
total: 36
```

```stdin
3
10 20 30
```

```expected hidden
chunk 0: 0
chunk 1: 10
chunk 2: 20
chunk 3: 30
total: 60
```

```stdin
0
```

```expected
chunk 0: 0
chunk 1: 0
chunk 2: 0
chunk 3: 0
total: 0
```

```checks
must std::thread :: Use std::thread.
must \.join\s*\(\s*\) :: Join the threads before printing.
```
:::

:::exercise Shared counter
Read `k` (number of threads, 1 to 16) and `m` (increments per thread). Start `k` threads that each
increment one **shared** counter `m` times, join them, and print `count = <k*m>`.

The counter must be safe to update from several threads: use `std::atomic<long long>` (or a
`std::mutex`).

```cpp starter
#include <iostream>
#include <thread>
#include <vector>

int main() {
    int k;
    long long m;
    std::cin >> k >> m;
    long long count = 0;
    std::cout << "count = " << count << '\n';
}
```

```cpp solution
#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    int k;
    long long m;
    std::cin >> k >> m;
    std::atomic<long long> count{0};

    std::vector<std::thread> threads;
    for (int t = 0; t < k; ++t) {
        threads.emplace_back([&count, m] {
            for (long long i = 0; i < m; ++i) ++count;
        });
    }
    for (auto& th : threads) th.join();

    std::cout << "count = " << count.load() << '\n';
}
```

```hint
`std::atomic<long long> count{0};` and `++count;` inside each thread. Capture `count` by reference.
```

```stdin
4 25000
```

```expected
count = 100000
```

```stdin
16 10000
```

```expected hidden
count = 160000
```

```stdin
3 0
```

```expected
count = 0
```

```checks
must std::(thread|jthread) :: Start threads with std::thread or std::jthread.
must std::atomic|std::mutex :: Protect the counter with std::atomic or std::mutex.
```
:::

:::exercise Primes in parallel
Read ranges `a b` (inclusive, 0 ≤ a ≤ b ≤ 200000) until the end of input. Count the primes in **each
range in its own task** using `std::async(std::launch::async, ...)`, storing the futures in a vector.
After launching all the tasks, collect the results with `.get()` in input order and print:

```
[<a>, <b>]: <count> primes
total: <sum of counts>
```

```cpp starter
#include <future>
#include <iostream>
#include <vector>

int countPrimes(int a, int b) {
    return 0;
}

int main() {
    int a, b;
    while (std::cin >> a >> b) {
        std::cout << "[" << a << ", " << b << "]: " << countPrimes(a, b) << " primes\n";
    }
}
```

```cpp solution
#include <future>
#include <iostream>
#include <utility>
#include <vector>

bool isPrime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; ++d)
        if (n % d == 0) return false;
    return true;
}

int countPrimes(int a, int b) {
    int count = 0;
    for (int n = a; n <= b; ++n)
        if (isPrime(n)) ++count;
    return count;
}

int main() {
    std::vector<std::pair<int, int>> ranges;
    std::vector<std::future<int>> futures;
    int a, b;
    while (std::cin >> a >> b) {
        ranges.emplace_back(a, b);
        futures.push_back(std::async(std::launch::async, countPrimes, a, b));
    }
    int total = 0;
    for (std::size_t i = 0; i < futures.size(); ++i) {
        int count = futures[i].get();
        total += count;
        std::cout << "[" << ranges[i].first << ", " << ranges[i].second << "]: " << count << " primes\n";
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
`futures.push_back(std::async(std::launch::async, countPrimes, a, b));` starts the work immediately.
Only call `.get()` after the input loop, so the tasks run in parallel.
```

```stdin
1 10
10 20
1 100
```

```expected
[1, 10]: 4 primes
[10, 20]: 4 primes
[1, 100]: 25 primes
total: 33
```

```stdin
0 1
2 2
1 200000
```

```expected hidden
[0, 1]: 0 primes
[2, 2]: 1 primes
[1, 200000]: 17984 primes
total: 17985
```

```expected
total: 0
```

```checks
must std::async :: Run each range with std::async.
must std::launch::async :: Use the std::launch::async policy.
must \.get\s*\(\s*\) :: Collect results with .get().
```
:::

:::exercise Word counts with jthreads
Read lines until the end of input. Process **each line in its own `std::jthread`**: split it into words
and add each word's count into one shared `std::map<std::string, int>`, protected by a `std::mutex`
(use `std::lock_guard` or `std::scoped_lock`).

Keep the `std::jthread`s in a vector inside a block, so they're all joined when the block ends. Then
print every word with its count in alphabetical order as `<word>: <count>`, and finally
`lines: <number of lines>`.

```cpp starter
#include <iostream>
#include <map>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

int main() {
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(std::cin, line)) lines.push_back(line);

    std::map<std::string, int> counts;
    std::mutex m;
    // count words with one std::jthread per line

    for (const auto& [word, count] : counts) std::cout << word << ": " << count << '\n';
    std::cout << "lines: " << lines.size() << '\n';
}
```

```cpp solution
#include <iostream>
#include <map>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

int main() {
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(std::cin, line)) lines.push_back(line);

    std::map<std::string, int> counts;
    std::mutex m;
    {
        std::vector<std::jthread> workers;
        for (const auto& text : lines) {
            workers.emplace_back([&counts, &m, &text] {
                std::map<std::string, int> local;       // count privately first...
                std::istringstream in(text);
                std::string word;
                while (in >> word) ++local[word];
                std::scoped_lock lock(m);               // ...then merge under the lock
                for (const auto& [w, c] : local) counts[w] += c;
            });
        }
    }   // every jthread joins here

    for (const auto& [word, count] : counts) std::cout << word << ": " << count << '\n';
    std::cout << "lines: " << lines.size() << '\n';
}
```

```hint
Capture `text` by reference: it refers to an element of `lines`, which outlives the threads (it isn't
modified while they run).
```

```hint
Counting into a local map and merging it under the lock at the end keeps the critical section short.
```

```stdin
the cat
the dog and the cat
dog
```

```expected
and: 1
cat: 2
dog: 2
the: 3
lines: 3
```

```stdin
a a a

b
```

```expected hidden
a: 3
b: 1
lines: 3
```

```expected
lines: 0
```

```checks
must std::jthread :: Use std::jthread for the workers.
must std::(lock_guard|scoped_lock|unique_lock) :: Lock the mutex with an RAII lock.
```
:::
