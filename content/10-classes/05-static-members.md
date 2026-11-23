---
title: Static Members
summary: Data and functions that belong to the class itself rather than to any one object, inline static members, and counting instances.
---

## One per class, not one per object

Every object gets its own copy of each normal member variable. Sometimes you want a value that is
**shared by all objects of a class**: a count of how many exist, the next ID to hand out, a
configuration constant. That's a **static data member**. Marking a member `static` means it belongs
to the **class itself**: there's exactly one, no matter how many objects you create (even zero).

```cpp run
#include <iostream>

class Player {
public:
    inline static int count = 0;   // one shared variable for the whole class (C++17 syntax)
    int score = 0;                 // one per object

    Player() { ++count; }
};

int main() {
    std::cout << Player::count << '\n';   // exists before any Player does
    Player a, b;
    Player c;
    a.score = 10;
    std::cout << Player::count << '\n';   // access through the class name...
    std::cout << c.count << '\n';         // ...or through any object (same variable)
    std::cout << a.score << ' ' << b.score << '\n';
}
```

```output
0
3
3
10 0
```

Prefer `ClassName::member` over `object.member` for statics: it makes clear that the value is shared.

## Declaring and defining static data members

There are three ways to set up a static data member, depending on your C++ version and the member's type:

```cpp
class Config {
public:
    // 1. C++17 and later: inline static. Declare AND define in the class. Use this.
    inline static int verbosity = 1;
    inline static std::string appName = "demo";

    // 2. static constexpr: compile-time constants. Implicitly inline since C++17.
    static constexpr int maxUsers = 100;
    static constexpr double pi = 3.14159;

    // 3. Pre-C++17: declare in the class...
    static int legacyCounter;
};

// ...and DEFINE it in exactly one .cpp file, outside the class (no 'static' keyword here):
int Config::legacyCounter = 0;
```

The old style (3) exists because a class definition usually lives in a header included by many `.cpp`
files, and the variable must be defined in exactly one place. `inline static` lets the linker merge the
copies, so you can define it right in the class. You'll still see style 3 in lots of existing code.

Forgetting the out-of-class definition for style 3 is a **link error**:

```cpp compile-error
class Counter {
public:
    static int count;       // declared but never defined
};

int main() {
    Counter::count = 5;     // undefined reference to `Counter::count'
}
```

And a non-`const`, non-`inline` static can't be initialized inside the class:

```cpp compile-error
class Counter {
public:
    static int count = 0;   // error: ISO C++ forbids in-class initialization of non-const static member
};

int main() {}
```

## Static member functions

A **static member function** also belongs to the class rather than to an object. You call it as
`ClassName::function()`, no object needed. The consequences:

- It has **no `this` pointer**.
- So it can only use **static** members directly. To touch a normal member it needs an object.
- It **cannot be `const`** (there's no object to be const), and can't be virtual.
- It *can* access private members of any object of its class you pass it, like any member function.

```cpp run
#include <iostream>

class Temperature {
private:
    double kelvin_;
    explicit Temperature(double k) : kelvin_(k) {}    // private constructor!

public:
    // "named constructors": static functions that build objects
    static Temperature fromCelsius(double c) { return Temperature(c + 273.15); }
    static Temperature fromKelvin(double k) { return Temperature(k); }

    static double absoluteZeroCelsius() { return -273.15; }

    double celsius() const { return kelvin_ - 273.15; }
};

int main() {
    Temperature boiling = Temperature::fromCelsius(100);
    Temperature cold = Temperature::fromKelvin(0);
    std::cout << boiling.celsius() << ' ' << cold.celsius() << '\n';
    std::cout << Temperature::absoluteZeroCelsius() << '\n';
    // Temperature t(5.0);   // error: the constructor is private
}
```

```output
100 -273.15
-273.15
```

That pattern, a **private constructor plus static factory functions**, gives each way of creating an
object a readable name. `Temperature(100)` would be ambiguous (Celsius? Kelvin?); `fromCelsius(100)` is not.

Using a non-static member from a static function fails, because there's no object:

```cpp compile-error
class Widget {
    int size_ = 0;
public:
    static int getSize() {
        return size_;       // error: invalid use of member 'Widget::size_' in static member function
    }
};

int main() {}
```

## Counting live instances

A classic use: track how many objects currently exist. Increment in **every** constructor, decrement in
the destructor. Don't forget that copies are objects too: the copy constructor (covered in the "Copy
Semantics" lesson) must count as well.

```cpp run
#include <iostream>
#include <vector>

class Widget {
    inline static int alive_ = 0;      // private: only Widget can change it
    inline static int created_ = 0;
    int id_;

public:
    Widget() : id_(++created_) { ++alive_; }
    Widget(const Widget&) : id_(++created_) { ++alive_; }   // copies count too!
    ~Widget() { --alive_; }

    static int alive() { return alive_; }
    static int created() { return created_; }
    int id() const { return id_; }
};

int main() {
    Widget a;
    {
        Widget b;
        Widget c = b;                  // a copy: created by the copy constructor
        std::cout << "inside: alive=" << Widget::alive() << " created=" << Widget::created() << '\n';
        std::cout << "c has id " << c.id() << '\n';
    }
    std::cout << "after: alive=" << Widget::alive() << " created=" << Widget::created() << '\n';

    std::vector<Widget> many(4);        // 4 default-constructed Widgets
    std::cout << "vector: alive=" << Widget::alive() << '\n';
}
```

```output
inside: alive=3 created=3
c has id 3
after: alive=1 created=3
vector: alive=5
```

Keeping the counters **private** with public static getters protects them: outside code can read the
count but can't corrupt it.

## Static vs non-static at a glance

| | Non-static member | Static member |
| --- | --- | --- |
| How many copies | One per object | One per class |
| Exists when | The object exists | Whole program (even with zero objects) |
| Access syntax | `obj.x`, `ptr->x` | `ClassName::x` (or `obj.x`) |
| Member functions get `this` | Yes | No |
| Function can use non-static members | Yes | Only through an object |
| Function can be `const` / `virtual` | Yes | No |
| Typical uses | Object state | Counters, ID generators, constants, factory functions |

> **Note:** `static` is an overloaded keyword. Inside a class it means "belongs to the class". On a local
> variable inside a function it means "keeps its value between calls". On a global variable or function
> it means "visible only in this `.cpp` file". Same word, three different meanings.

> **Warning:** Static data members are global state in disguise. A mutable shared counter is fine for
> learning and for simple statistics, but a program full of them is hard to test and is not
> thread-safe without extra work.

:::quiz
`class A { public: inline static int n = 0; int m = 0; };` After `A x, y, z;` how many `n` and how many `m` variables exist?

- [ ] 3 `n`, 3 `m`
- [x] 1 `n`, 3 `m`
- [ ] 1 `n`, 1 `m`
- [ ] 0 `n`, 3 `m`

There is exactly one static member per class; each object has its own non-static members.
:::

:::quiz
Which are true about static member functions? (select all that apply)

- [x] They can be called without any object: `ClassName::f()`
- [x] They have no `this` pointer
- [ ] They can be marked `const`
- [ ] They can directly read non-static members

With no object involved, there's no `this`, so no direct access to non-static members, and `const`
(which qualifies `this`) makes no sense.
:::

:::exercise Instance counter {easy}
Complete the `Tracker` class with two **static** counters:

- `alive`: how many `Tracker` objects currently exist,
- `total`: how many have ever been created.

The default constructor increments both; the destructor decrements `alive`. Add static member functions
`int alive()` and `int total()` that return them. (No copies are made in this program.)

**Input:** an integer `n` (0 or more).
**Output:** exactly the three lines printed by `main`. For `n = 3`:

```
alive: 3
alive: 1
total: 4
```

```cpp starter
#include <iostream>
#include <vector>

class Tracker {
public:
    Tracker() {}
    ~Tracker() {}
    static int alive() { return 0; }
    static int total() { return 0; }
};

int main() {
    int n;
    std::cin >> n;
    {
        std::vector<Tracker> group(n);
        std::cout << "alive: " << Tracker::alive() << '\n';
    }
    Tracker last;
    std::cout << "alive: " << Tracker::alive() << '\n';
    std::cout << "total: " << Tracker::total() << '\n';
}
```

```cpp solution
#include <iostream>
#include <vector>

class Tracker {
    inline static int alive_ = 0;
    inline static int total_ = 0;
public:
    Tracker() {
        ++alive_;
        ++total_;
    }
    ~Tracker() { --alive_; }
    static int alive() { return alive_; }
    static int total() { return total_; }
};

int main() {
    int n;
    std::cin >> n;
    {
        std::vector<Tracker> group(n);
        std::cout << "alive: " << Tracker::alive() << '\n';
    }
    Tracker last;
    std::cout << "alive: " << Tracker::alive() << '\n';
    std::cout << "total: " << Tracker::total() << '\n';
}
```

```hint
Add `inline static int alive_ = 0;` and `inline static int total_ = 0;` as private members.
```

```stdin
3
```

```expected
alive: 3
alive: 1
total: 4
```

```stdin
0
```

```expected hidden
alive: 0
alive: 1
total: 1
```

```checks
must \bstatic\s+int\s+\w+\s*=|\binline\s+static\b|static\s+inline\b|int\s+Tracker::\w+\s*= :: Use static data members for the counters.
```
:::

:::exercise Ticket numbers {easy}
Write a class `Ticket` that gives every new ticket a unique number, starting at **1**, from a **static**
counter. The constructor takes the holder's name. Add:

- `int number() const` and `const std::string& holder() const`,
- a static member function `static int issued()` returning how many tickets have been created.

**Input:** names, one per line, until end of input (possibly none).
**Output:** one line per ticket `#N NAME`, then a final line `issued: K`.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

class Ticket {
    std::string holder_;
public:
    explicit Ticket(const std::string& holder) : holder_(holder) {}
    int number() const { return 0; }
    const std::string& holder() const { return holder_; }
};

int main() {
    std::vector<std::string> names;
    std::string name;
    while (std::cin >> name) names.push_back(name);

    for (const auto& n : names) {
        Ticket t(n);
        std::cout << '#' << t.number() << ' ' << t.holder() << '\n';
    }
    std::cout << "issued: " << 0 << '\n';   // use Ticket::issued()
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

class Ticket {
    inline static int nextNumber_ = 1;
    std::string holder_;
    int number_;
public:
    explicit Ticket(const std::string& holder) : holder_(holder), number_(nextNumber_++) {}
    int number() const { return number_; }
    const std::string& holder() const { return holder_; }
    static int issued() { return nextNumber_ - 1; }
};

int main() {
    std::vector<std::string> names;
    std::string name;
    while (std::cin >> name) names.push_back(name);

    for (const auto& n : names) {
        Ticket t(n);
        std::cout << '#' << t.number() << ' ' << t.holder() << '\n';
    }
    std::cout << "issued: " << Ticket::issued() << '\n';
}
```

```hint
Keep `inline static int nextNumber_ = 1;` and initialize each ticket's own `number_(nextNumber_++)`.
```

```stdin
alice
bob
carol
```

```expected
#1 alice
#2 bob
#3 carol
issued: 3
```

```stdin
```

```expected hidden
issued: 0
```

```checks
must static\s+int\s+issued\s*\( :: Add a static member function issued().
must Ticket::issued\s*\( :: Call it as Ticket::issued().
```
:::

:::exercise Named constructors {medium}
Write a `Distance` class that stores a length in **meters**. Its constructor must be **private**;
objects are created only through three **static** factory functions:

- `Distance::fromMeters(double)`
- `Distance::fromKilometers(double)` (1 km = 1000 m)
- `Distance::fromMiles(double)` (1 mile = 1609.344 m)

Add `double meters() const`.

**Input:** a value and a unit, one of `m`, `km`, `mi`.
**Output:** the distance in meters with exactly 3 decimal places.

```cpp starter
#include <iostream>
#include <iomanip>
#include <string>

class Distance {
    double meters_ = 0;
public:
    explicit Distance(double m) : meters_(m) {}   // should be private
    double meters() const { return meters_; }
};

int main() {
    double value;
    std::string unit;
    std::cin >> value >> unit;
    Distance d(value);   // use the right factory function instead
    std::cout << std::fixed << std::setprecision(3) << d.meters() << '\n';
}
```

```cpp solution
#include <iostream>
#include <iomanip>
#include <string>

class Distance {
    double meters_ = 0;
    explicit Distance(double m) : meters_(m) {}
public:
    static Distance fromMeters(double m) { return Distance(m); }
    static Distance fromKilometers(double km) { return Distance(km * 1000.0); }
    static Distance fromMiles(double mi) { return Distance(mi * 1609.344); }
    double meters() const { return meters_; }
};

Distance parse(double value, const std::string& unit) {
    if (unit == "km") return Distance::fromKilometers(value);
    if (unit == "mi") return Distance::fromMiles(value);
    return Distance::fromMeters(value);
}

int main() {
    double value;
    std::string unit;
    std::cin >> value >> unit;
    Distance d = parse(value, unit);
    std::cout << std::fixed << std::setprecision(3) << d.meters() << '\n';
}
```

```hint
A `class` starts in private mode, so moving the constructor above `public:` makes it private.
```

```hint
Since `Distance` has no default constructor, you can't write `Distance d;` and assign later. A helper function that `return`s the right factory call works well.
```

```stdin
2 mi
```

```expected
3218.688
```

```stdin
1.5 km
```

```expected hidden
1500.000
```

```stdin
0 m
```

```expected hidden
0.000
```

```checks
must static\s+Distance\s+fromMiles\s*\( :: Write a static fromMiles factory.
must Distance::fromKilometers\s*\( :: Create objects through the factories, e.g. Distance::fromKilometers(...).
mustnot public\s*:[^}]*explicit\s+Distance\s*\(\s*double :: The Distance(double) constructor must be private.
```
:::

:::exercise Recycled session IDs {hard}
A chat server gives every logged-in user a `Session` with a numeric id. Ids are **recycled**: a new
session always gets the **smallest positive id not used by a live session**. Design `Session` so the
class itself manages this with **static** members:

- The constructor `explicit Session(std::string user)` takes the smallest free id; the destructor
  gives it back. No outside code ever chooses or frees an id.
- Static member functions `active()` (live sessions), `peak()` (the largest number of sessions that were
  ever alive at the same time) and `created()` (sessions ever created).
- A copy would hold the same id as the original, so `Session` must **not** be copyable.

**Input:** commands until end of input:

| Command | Output |
| --- | --- |
| `login NAME` | `NAME got id ID`, or `NAME already logged in` |
| `logout NAME` | `NAME logged out (id ID)`, or `NAME not logged in` |
| `stats` | `active A, peak P, created C` |

```cpp starter
#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <vector>

class Session {
    // TODO
};

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Session {
    inline static std::vector<bool> inUse_{false};   // inUse_[id]; index 0 is never used
    inline static int active_ = 0;
    inline static int peak_ = 0;
    inline static int created_ = 0;

    std::string user_;
    int id_;

    static int acquire() {
        for (std::size_t i = 1; i < inUse_.size(); ++i) {
            if (!inUse_[i]) {
                inUse_[i] = true;
                return static_cast<int>(i);
            }
        }
        inUse_.push_back(true);
        return static_cast<int>(inUse_.size()) - 1;
    }

public:
    explicit Session(std::string user) : user_(std::move(user)), id_(acquire()) {
        ++created_;
        ++active_;
        if (active_ > peak_) peak_ = active_;
    }
    ~Session() {
        inUse_[id_] = false;
        --active_;
    }
    Session(const Session&) = delete;
    Session& operator=(const Session&) = delete;

    int id() const { return id_; }
    const std::string& user() const { return user_; }

    static int active() { return active_; }
    static int peak() { return peak_; }
    static int created() { return created_; }
};

int main() {
    std::map<std::string, std::unique_ptr<Session>> sessions;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "stats") {
            std::cout << "active " << Session::active() << ", peak " << Session::peak()
                      << ", created " << Session::created() << '\n';
            continue;
        }
        std::string name;
        std::cin >> name;
        auto it = sessions.find(name);
        if (cmd == "login") {
            if (it != sessions.end()) {
                std::cout << name << " already logged in\n";
            } else {
                auto s = std::make_unique<Session>(name);
                std::cout << name << " got id " << s->id() << '\n';
                sessions[name] = std::move(s);
            }
        } else if (cmd == "logout") {
            if (it == sessions.end()) {
                std::cout << name << " not logged in\n";
            } else {
                int id = it->second->id();
                sessions.erase(it);              // the Session's destructor frees the id
                std::cout << name << " logged out (id " << id << ")\n";
            }
        }
    }
}
```

```hint
The pool of ids belongs to the class, not to any session: an `inline static std::vector<bool>` where
element `i` says whether id `i` is taken works well. A private static helper can find (or append) the
smallest free slot.
```

```hint
In `main`, a `std::map<std::string, std::unique_ptr<Session>>` keyed by user name lets you find a
session, and `erase` destroys it (running the destructor that frees the id). Delete the copy
constructor and copy assignment with `= delete`.
```

```stdin
login ann
login bob
login cy
logout bob
login dan
stats
```

```expected
ann got id 1
bob got id 2
cy got id 3
bob logged out (id 2)
dan got id 2
active 3, peak 3, created 4
```

```stdin
stats
logout ghost
login ann
login ann
logout ann
logout ann
login ann
stats
```

```expected hidden
active 0, peak 0, created 0
ghost not logged in
ann got id 1
ann already logged in
ann logged out (id 1)
ann not logged in
ann got id 1
active 1, peak 1, created 2
```

```stdin
login a
login b
login c
login d
logout a
logout c
stats
login e
login f
login g
logout d
logout b
login h
stats
```

```expected hidden
a got id 1
b got id 2
c got id 3
d got id 4
a logged out (id 1)
c logged out (id 3)
active 2, peak 4, created 4
e got id 1
f got id 3
g got id 5
d logged out (id 4)
b logged out (id 2)
h got id 2
active 4, peak 5, created 8
```

```checks
must \bstatic\s+int\s+active\s*\( :: Provide a static member function active().
must Session\s*\(\s*const\s+Session\s*&\s*\)\s*=\s*delete :: Make Session non-copyable (delete the copy constructor).
must ~\s*Session\s*\( :: Free the id in Session's destructor.
```
:::
