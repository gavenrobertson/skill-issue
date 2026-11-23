---
title: Classes & Objects
summary: What object-oriented programming is, how to write a class, public and private members, encapsulation, and defining member functions inside or outside the class.
---

## Why classes?

So far your programs have been **data** (variables, structs, vectors) plus **functions** that work on
that data, kept separate. That works for small programs, but as they grow you hit a problem: nothing
stops *any* code from putting the data into a nonsense state. If a `struct BankAccount` has a public
`balance`, any line anywhere can write `account.balance = -1000000;`.

**Object-oriented programming (OOP)** fixes this by bundling data **together with the functions that
are allowed to change it**, and hiding the data from everyone else. The bundle is a **class**:

- A **class** is a *blueprint*: a user-defined type that describes what data an object holds and
  what it can do.
- An **object** (or **instance**) is one concrete value of that type, built from the blueprint. You
  can create as many objects from one class as you like, just like many `int`s.
- The data inside are **member variables** (also called *data members* or *fields*).
- The functions inside are **member functions** (often called *methods*).

```cpp run
#include <iostream>
#include <string>

class Dog {
public:
    std::string name;   // member variable
    int age;            // member variable

    void bark() {       // member function
        std::cout << name << " says woof!\n";
    }
};                      // <- the semicolon is required!

int main() {
    Dog rex;            // an object of type Dog
    rex.name = "Rex";
    rex.age = 3;

    Dog fido;           // a second, independent object
    fido.name = "Fido";
    fido.age = 5;

    rex.bark();         // call a member function with the dot operator
    fido.bark();
    std::cout << rex.name << " is " << rex.age << '\n';
}
```

```output
Rex says woof!
Fido says woof!
Rex is 3
```

Inside a member function, a bare `name` means *the `name` of the object the function was called on*.
`rex.bark()` sees Rex's name; `fido.bark()` sees Fido's. Each object has its own copy of every
member variable, but there's only one copy of the code.

As with structs, you access members with `.` on an object and with `->` through a pointer:

```cpp
Dog* p = &rex;
p->bark();       // same as (*p).bark()
```

## `class` vs `struct`

You already know `struct`. Here is the surprise: in C++, **`struct` and `class` are the same thing**.
Both can have member functions, constructors, private members, inheritance, everything. The **only**
difference is the **default access**:

| Keyword | Members are by default | Inheritance is by default |
| --- | --- | --- |
| `struct` | `public` | `public` |
| `class` | `private` | `private` |

```cpp
struct S { int x; };    // x is public
class  C { int x; };    // x is private
```

**Convention:** use `struct` for simple bundles of data with no rules to protect (a `Point`, a
`Config`), and `class` when the type has **invariants** (rules that must always hold) and therefore
private data. That's a convention for humans, not a language rule.

## Access specifiers: `public`, `private`, `protected`

Inside a class, the labels `public:`, `private:`, and `protected:` control **who may use** the members
that follow. A label applies until the next label; you can use each as many times as you like.

| Specifier | Who can access the member |
| --- | --- |
| `public` | Anyone |
| `private` | Only member functions (and friends) of **this class** |
| `protected` | This class, plus classes that **inherit** from it (see the Inheritance module) |

```cpp compile-error
class Thermostat {
private:
    double target_ = 20.0;
public:
    void raise() { target_ += 0.5; }   // OK: member functions can use private members
};

int main() {
    Thermostat t;
    t.raise();          // OK: raise() is public
    t.target_ = 99.0;   // error: 'double Thermostat::target_' is private within this context
}
```

Access is checked **per class, not per object**: a member function can touch the private members of
*another* object of the same class (handy for comparing or copying).

```cpp
class Box {
    int size_ = 0;
public:
    bool biggerThan(Box other) { return size_ > other.size_; }  // OK: same class
};
```

> **Note:** Many codebases mark private members with a trailing underscore (`target_`) or an `m_`
> prefix (`m_target`) so you can tell members from local variables at a glance. This guide uses the
> trailing underscore.

## Encapsulation and invariants

**Encapsulation** means hiding an object's data and only allowing changes through member functions
that keep it valid. The rules that must always be true are the class's **invariants**.

```cpp run
#include <iostream>

class BankAccount {
private:
    long long balance_ = 0;            // invariant: never negative

public:
    void deposit(long long amount) {
        if (amount > 0) balance_ += amount;
    }

    bool withdraw(long long amount) {
        if (amount <= 0 || amount > balance_) return false;   // refuse, invariant kept
        balance_ -= amount;
        return true;
    }

    long long balance() const { return balance_; }
};

int main() {
    BankAccount acc;
    acc.deposit(100);
    std::cout << std::boolalpha;
    std::cout << acc.withdraw(30) << '\n';    // true
    std::cout << acc.withdraw(500) << '\n';   // false: would go negative
    std::cout << acc.balance() << '\n';
}
```

```output
true
false
70
```

Because `balance_` is private, the *only* code that can change it is `deposit` and `withdraw`. If the
balance ever goes wrong, you know exactly where to look. And you can later change how the balance is
stored (say, as a `double` or in cents) without breaking any code that uses the class, because that
code only ever saw the public functions. The public functions are the class's **interface**; the
private data is its **implementation**.

> **Note:** The `const` after `balance()` promises that the function does not modify the object. Put
> it on every member function that only reads. The full story (and why it matters) is in the
> "`this`, `const` & `mutable`" lesson; for now, just copy the pattern for getters.

## Getters and setters

A **getter** (accessor) returns a private value; a **setter** (mutator) changes it, usually after
validating. Naming styles vary: `getAge()`/`setAge()`, or just `age()`/`setAge()`.

```cpp run
#include <iostream>
#include <string>

class Person {
private:
    std::string name_;
    int age_ = 0;

public:
    // getters: const, return by value (or by const reference for big objects)
    const std::string& name() const { return name_; }
    int age() const { return age_; }

    // setters: validate before changing
    void setName(const std::string& n) {
        if (!n.empty()) name_ = n;
    }
    void setAge(int a) {
        if (a >= 0 && a <= 150) age_ = a;    // ignore impossible values
    }
};

int main() {
    Person p;
    p.setName("Ada");
    p.setAge(36);
    p.setAge(-5);                  // rejected
    std::cout << p.name() << ", " << p.age() << '\n';
}
```

```output
Ada, 36
```

> **Tip:** Don't write a getter and setter for every member by reflex. A class whose every field has
> a plain `get`/`set` pair is just a struct with extra typing. Ask what *operations* the object
> should support (`deposit`, `withdraw`) rather than which fields to expose.

## Defining member functions outside the class

Member functions can be defined **inside** the class body (as above) or only **declared** there and
defined **outside**, using the **scope resolution operator** `ClassName::`:

```cpp run
#include <iostream>

class Rectangle {
private:
    double width_ = 0;
    double height_ = 0;

public:
    void set(double w, double h);      // declarations only
    double area() const;
    double perimeter() const;
};

// Definitions: ClassName::functionName. The const must be repeated.
void Rectangle::set(double w, double h) {
    width_ = w;                        // members are in scope, just like inside the class
    height_ = h;
}

double Rectangle::area() const {
    return width_ * height_;
}

double Rectangle::perimeter() const {
    return 2 * (width_ + height_);
}

int main() {
    Rectangle r;
    r.set(3, 4);
    std::cout << r.area() << ' ' << r.perimeter() << '\n';
}
```

```output
12 14
```

What's the difference?

- A function **defined inside** the class is implicitly `inline`: fine to put in a header that many
  files include. Good for short functions like getters.
- A function **defined outside** keeps the class definition short and readable, and lets you put
  the code in a separate `.cpp` file.

## Header/source split

In real projects a class is usually split across two files: the **header** (`.h` / `.hpp`) holds the
class definition (what the class *is*), and the **source file** (`.cpp`) holds the member function
definitions (how it *works*). Other files `#include` only the header. The IDE here uses a single file,
so the split is shown as comments:

```cpp
// ===== counter.h =====
#pragma once                 // include this header only once per .cpp file

class Counter {
public:
    void increment();
    int value() const;
private:
    int count_ = 0;
};

// ===== counter.cpp =====
#include "counter.h"

void Counter::increment() { ++count_; }
int Counter::value() const { return count_; }

// ===== main.cpp =====
#include <iostream>
#include "counter.h"

int main() {
    Counter c;
    c.increment();
    std::cout << c.value() << '\n';
}
```

You'd build it with `g++ -std=c++20 main.cpp counter.cpp -o app`. The "Namespaces, the preprocessor
& multi-file programs" module covers this in depth.

> **Tip:** A common layout puts `public:` first (the interface readers care about) and `private:`
> last (implementation details). Either order is legal.

## Common mistakes

**Forgetting the semicolon after the class.** The error is confusing because it's reported on the
*next* line:

```cpp compile-error
class Point {
    int x_ = 0;
}                // missing ';'

int main() {}    // error: expected ';' after class definition
```

**Forgetting `ClassName::` when defining outside.** Without it you've written an unrelated free
function, which has no idea what `width_` is:

```cpp compile-error
class Square {
    double side_ = 1;
public:
    double area() const;
};

double area() {                 // oops: should be Square::area() const
    return side_ * side_;       // error: 'side_' was not declared in this scope
}

int main() {}
```

**Calling a member function without an object.** `Dog::bark();` doesn't work for a normal member
function: which dog would be barking? You need `someDog.bark()`.

**Mismatched `const`.** If the declaration says `double area() const;` then the definition must also
say `const`, or the compiler reports "no declaration matches".

:::quiz
What is the default access of members declared in a `class` before any access label?

- [ ] `public`
- [x] `private`
- [ ] `protected`
- [ ] It depends on the compiler

In a `class`, members are private until a label says otherwise. In a `struct`, they are public.
:::

:::quiz
Which statements about `struct` and `class` in C++ are true? (select all that apply)

- [x] Both can have member functions and private members
- [x] The only language difference is the default access (and default inheritance)
- [ ] Only a `class` can have constructors
- [ ] A `struct` cannot have member functions

They are the same feature with different defaults. Choosing between them is a style convention.
:::

:::quiz
Given `class Car { int speed_; public: void go(); };` and `Car c;` in `main`, which line compiles?

- [x] `c.go();`
- [ ] `c.speed_ = 10;`
- [ ] `Car::go();`
- [ ] `go(c);`

`go` is public, so `c.go()` works. `speed_` is private. `Car::go()` has no object to work on, and
`go(c)` would call a free function that doesn't exist.
:::

:::exercise Rectangle class {easy}
Complete the `Rectangle` class. It has two **private** members `width_` and `height_`, and three public
member functions:

- `void set(int w, int h)`: stores the dimensions; if either is negative, store `0` for that one instead.
- `int area()`: returns width × height.
- `int perimeter()`: returns 2 × (width + height).

**Input:** two integers `w h`.
**Output:** the area and perimeter separated by a space, e.g. `12 14`.

```cpp starter
#include <iostream>

class Rectangle {
    // add private members and public member functions
};

int main() {
    int w, h;
    std::cin >> w >> h;
    Rectangle r;
    // r.set(w, h);
    // std::cout << r.area() << ' ' << r.perimeter() << '\n';
}
```

```cpp solution
#include <iostream>

class Rectangle {
private:
    int width_ = 0;
    int height_ = 0;

public:
    void set(int w, int h) {
        width_ = w < 0 ? 0 : w;
        height_ = h < 0 ? 0 : h;
    }
    int area() const { return width_ * height_; }
    int perimeter() const { return 2 * (width_ + height_); }
};

int main() {
    int w, h;
    std::cin >> w >> h;
    Rectangle r;
    r.set(w, h);
    std::cout << r.area() << ' ' << r.perimeter() << '\n';
}
```

```hint
Start with `private:` and declare `int width_ = 0;` and `int height_ = 0;`, then `public:` and the three functions.
```

```hint
In `set`, use something like `width_ = w < 0 ? 0 : w;`.
```

```stdin
3 4
```

```expected
12 14
```

```stdin
-5 7
```

```expected hidden
0 14
```

```stdin
0 0
```

```expected hidden
0 0
```

```checks
must \bclass\s+Rectangle\b :: Define Rectangle with the class keyword.
must \bprivate\s*: :: Put the data members in a private: section.
must \.set\s*\( :: Call r.set(w, h) in main.
```
:::

:::exercise Bank account {medium}
Write a class `BankAccount` with a **private** balance (an `int`, starting at 0) and these public members:

- `void deposit(int amount)`: adds `amount` if it is positive, otherwise does nothing.
- `bool withdraw(int amount)`: if `amount` is positive and not more than the balance, subtracts it
  and returns `true`; otherwise changes nothing and returns `false`.
- `int balance() const`: returns the balance.

**Input:** a number `n`, then `n` lines each holding a command letter and an amount: `D 50` (deposit)
or `W 30` (withdraw).
**Output:** for each **failed** withdrawal print `Insufficient funds`. At the end print
`Balance: X`.

```cpp starter
#include <iostream>

class BankAccount {
public:
    int balance_ = 0;   // should not be public!
};

int main() {
    int n;
    std::cin >> n;
    BankAccount acc;
    for (int i = 0; i < n; ++i) {
        char cmd;
        int amount;
        std::cin >> cmd >> amount;
        // use acc.deposit / acc.withdraw here
    }
    std::cout << "Balance: " << acc.balance_ << '\n';
}
```

```cpp solution
#include <iostream>

class BankAccount {
private:
    int balance_ = 0;

public:
    void deposit(int amount) {
        if (amount > 0) balance_ += amount;
    }
    bool withdraw(int amount) {
        if (amount <= 0 || amount > balance_) return false;
        balance_ -= amount;
        return true;
    }
    int balance() const { return balance_; }
};

int main() {
    int n;
    std::cin >> n;
    BankAccount acc;
    for (int i = 0; i < n; ++i) {
        char cmd;
        int amount;
        std::cin >> cmd >> amount;
        if (cmd == 'D') {
            acc.deposit(amount);
        } else if (cmd == 'W') {
            if (!acc.withdraw(amount)) std::cout << "Insufficient funds\n";
        }
    }
    std::cout << "Balance: " << acc.balance() << '\n';
}
```

```hint
Move `balance_` under `private:` and add the three public functions. `main` must then use `acc.balance()`.
```

```hint
`if (!acc.withdraw(amount)) std::cout << "Insufficient funds\n";`
```

```stdin
3
D 100
W 30
W 100
```

```expected
Insufficient funds
Balance: 70
```

```stdin
4
W 10
D -50
D 20
W 20
```

```expected hidden
Insufficient funds
Balance: 0
```

```stdin
4
D 50
W 0
W -5
W 50
```

```expected hidden
Insufficient funds
Insufficient funds
Balance: 0
```

```checks
must \bprivate\s*: :: The balance must be private.
must \bbool\s+withdraw\s*\( :: withdraw should return bool.
must acc\.balance\s*\(\s*\) :: Read the balance through the balance() getter.
```
:::

:::exercise Define it outside {easy}
The `Temperature` class below only **declares** its member functions. Define all three **outside** the
class using `Temperature::`.

- `void setCelsius(double c)`: stores the temperature, but never below absolute zero (`-273.15`);
  values lower than that are stored as `-273.15`.
- `double celsius() const`: returns the stored value.
- `double fahrenheit() const`: returns `c * 9 / 5 + 32`.

**Input:** one number, the temperature in Celsius.
**Output:** `C F`, both with exactly 2 digits after the decimal point, e.g. `100.00 212.00`.

```cpp starter
#include <iostream>
#include <iomanip>

class Temperature {
private:
    double celsius_ = 0.0;

public:
    void setCelsius(double c);
    double celsius() const;
    double fahrenheit() const;
};

// define the three member functions here

int main() {
    double c;
    std::cin >> c;
    Temperature t;
    std::cout << std::fixed << std::setprecision(2);
    std::cout << c << ' ' << c << '\n';   // replace with t.setCelsius(...) and the getters
}
```

```cpp solution
#include <iostream>
#include <iomanip>

class Temperature {
private:
    double celsius_ = 0.0;

public:
    void setCelsius(double c);
    double celsius() const;
    double fahrenheit() const;
};

void Temperature::setCelsius(double c) {
    celsius_ = c < -273.15 ? -273.15 : c;
}

double Temperature::celsius() const {
    return celsius_;
}

double Temperature::fahrenheit() const {
    return celsius_ * 9 / 5 + 32;
}

int main() {
    double c;
    std::cin >> c;
    Temperature t;
    t.setCelsius(c);
    std::cout << std::fixed << std::setprecision(2);
    std::cout << t.celsius() << ' ' << t.fahrenheit() << '\n';
}
```

```hint
The pattern is `ReturnType ClassName::name(params) const { ... }`, for example `double Temperature::celsius() const { return celsius_; }`.
```

```stdin
100
```

```expected
100.00 212.00
```

```stdin
-300
```

```expected hidden
-273.15 -459.67
```

```stdin
-40
```

```expected hidden
-40.00 -40.00
```

```checks
must Temperature::setCelsius\s*\( :: Define setCelsius outside the class with Temperature::.
must Temperature::fahrenheit\s*\(\s*\)\s*const :: Define fahrenheit outside the class (keep the const).
must \bt\.fahrenheit\s*\( :: Print the result of t.fahrenheit().
```
:::

:::exercise Elevator controller {hard}
Write a class `Elevator` that **protects its invariants**: the elevator is always on a floor between
its lowest and highest floor, and never holds more people than its capacity. All data is private;
the outside world can only send it requests through member functions, and invalid requests are
refused without changing anything.

**Input:** the first line holds `lo hi cap`: the lowest floor, the highest floor (`lo <= hi`, floors
can be negative for basements) and the capacity (at least 1). The elevator starts on floor `lo`,
empty. Then commands until end of input:

| Command | Effect and output |
| --- | --- |
| `go F` | If `F` is outside `lo..hi`, print `error: no floor F`. Otherwise move to `F`, add the distance travelled to a running total, and print `at F`. |
| `in N` | If `N <= 0`, print `error: bad count`. Otherwise as many of the `N` people as fit get in. Print `boarded N` if everyone fit, or `boarded K, M left behind`. |
| `out N` | If `N <= 0`, print `error: bad count`. If `N` is more than the people inside (`L`), print `error: only L inside` and change nothing. Otherwise print `left N`. |
| `status` | Print `floor F, load L/CAP, travelled T`. |

**Example:** for `0 5 4` then `in 3`, `go 4`, `in 2`, `go 1`, `out 5`, `status` the output is:

```
boarded 3
at 4
boarded 1, 1 left behind
at 1
error: only 4 inside
floor 1, load 4/4, travelled 7
```

```cpp starter
#include <iostream>
#include <string>

class Elevator {
    // your design: private data + public member functions
};

int main() {
    int lo, hi, cap;
    std::cin >> lo >> hi >> cap;
    // read commands until end of input and drive an Elevator
}
```

```cpp solution
#include <iostream>
#include <string>

class Elevator {
private:
    int lo_ = 0, hi_ = 0, cap_ = 1;
    int floor_ = 0, load_ = 0;
    long long travelled_ = 0;

public:
    void setup(int lo, int hi, int cap) {
        lo_ = lo;
        hi_ = hi;
        cap_ = cap;
        floor_ = lo;
        load_ = 0;
        travelled_ = 0;
    }

    bool go(int f) {
        if (f < lo_ || f > hi_) return false;
        travelled_ += f > floor_ ? f - floor_ : floor_ - f;
        floor_ = f;
        return true;
    }

    // returns how many people actually got in
    int board(int n) {
        int room = cap_ - load_;
        int k = n < room ? n : room;
        load_ += k;
        return k;
    }

    bool leave(int n) {
        if (n > load_) return false;
        load_ -= n;
        return true;
    }

    int floor() const { return floor_; }
    int load() const { return load_; }
    int capacity() const { return cap_; }
    long long travelled() const { return travelled_; }
};

int main() {
    int lo, hi, cap;
    std::cin >> lo >> hi >> cap;
    Elevator e;
    e.setup(lo, hi, cap);

    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "status") {
            std::cout << "floor " << e.floor() << ", load " << e.load() << '/' << e.capacity()
                      << ", travelled " << e.travelled() << '\n';
            continue;
        }
        int n;
        std::cin >> n;
        if (cmd == "go") {
            if (e.go(n)) std::cout << "at " << n << '\n';
            else std::cout << "error: no floor " << n << '\n';
        } else if (n <= 0) {
            std::cout << "error: bad count\n";
        } else if (cmd == "in") {
            int k = e.board(n);
            if (k == n) std::cout << "boarded " << n << '\n';
            else std::cout << "boarded " << k << ", " << n - k << " left behind\n";
        } else if (cmd == "out") {
            if (e.leave(n)) std::cout << "left " << n << '\n';
            else std::cout << "error: only " << e.load() << " inside\n";
        }
    }
}
```

```hint
A possible interface: `void setup(int lo, int hi, int cap)`, `bool go(int f)`, `int board(int n)`
(returns how many got in), `bool leave(int n)`, plus `const` getters for the status line. Keep the
printing in `main` and the rules in the class.
```

```hint
The distance between floors is the absolute difference, which matters with basements: from `-2` to `3`
is 5 floors.
```

```stdin
0 5 4
in 3
go 4
in 2
go 1
out 5
status
```

```expected
boarded 3
at 4
boarded 1, 1 left behind
at 1
error: only 4 inside
floor 1, load 4/4, travelled 7
```

```stdin
-2 3 2
status
go 3
go 4
go -3
go -2
in 0
out -1
out 1
status
```

```expected hidden
floor -2, load 0/2, travelled 0
at 3
error: no floor 4
error: no floor -3
at -2
error: bad count
error: bad count
error: only 0 inside
floor -2, load 0/2, travelled 10
```

```stdin
1 1 1
in 5
in 1
out 1
go 1
out 1
status
```

```expected hidden
boarded 1, 4 left behind
boarded 0, 1 left behind
left 1
at 1
error: only 0 inside
floor 1, load 0/1, travelled 0
```

```checks
must \bclass\s+Elevator\b :: Write an Elevator class.
must \bprivate\s*: :: Put the elevator's data in a private: section.
```
:::
