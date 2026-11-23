---
title: Inheritance Access & Composition
summary: Public, protected, and private inheritance, the struct/class default, re-exposing members with using, and why "has-a" composition is usually better than inheritance.
---

## Three kinds of inheritance

The keyword in `class Dog : public Animal` is the **inheritance access specifier**. It sets the
*maximum* access that inherited members get in the derived class, as seen from outside and from
further-derived classes:

| Base member | `public` inheritance | `protected` inheritance | `private` inheritance |
| --- | --- | --- | --- |
| `public` | stays `public` | becomes `protected` | becomes `private` |
| `protected` | stays `protected` | stays `protected` | becomes `private` |
| `private` | inaccessible | inaccessible | inaccessible |

Two things the inheritance kind **never** changes:

- The derived class's own member functions can always use the base's public and protected members.
- The base's private members are never accessible to the derived class.

What it changes is what **outsiders** (and grandchildren) see, and whether outsiders may treat a
`Derived` as a `Base`:

```cpp compile-error
#include <iostream>

class Base {
public:
    void hello() const { std::cout << "hello\n"; }
};

class Pub  : public Base    {};
class Prot : protected Base { public: void callHello() const { hello(); } };   // OK inside
class Priv : private Base   { public: void callHello() const { hello(); } };   // OK inside

int main() {
    Pub a;   a.hello();          // OK: still public
    Prot b;  b.callHello();      // OK
    Priv c;  c.callHello();      // OK

    b.hello();                   // error: 'Base' is not an accessible base / hello is protected here
    c.hello();                   // error: hello is private within Priv

    Base& r = c;                 // error: 'Base' is an inaccessible base of 'Priv'
}
```

### What each one means

- **`public` inheritance** models **"is-a"**. A `Dog` is an `Animal`, everyone may know it, and a `Dog`
  can be passed wherever an `Animal&` is expected. This is the one you'll use 99% of the time.
- **`private` inheritance** means **"is implemented in terms of"**. The derived class *uses* the base's
  code internally, but that's an implementation detail: outsiders can't call base members or convert
  to the base. Composition (below) usually expresses this better.
- **`protected` inheritance** is like private, but further-derived classes can still see the base. It's
  rarely used.

## The `struct` vs `class` default

As you saw in the Classes module, `struct` and `class` differ only in defaults. That includes the
**default inheritance access**:

```cpp
struct A : Base {};   // public inheritance (struct default)
class  B : Base {};   // PRIVATE inheritance (class default)
```

Forgetting `public` with `class` is a classic mistake. The error appears far away, when outside code
tries to use a base member or convert to the base:

```cpp compile-error
#include <string>

class Employee {
    std::string name_;
public:
    explicit Employee(const std::string& n) : name_(n) {}
    const std::string& name() const { return name_; }
};

class Manager : Employee {       // oops: private inheritance by default
public:
    using Employee::Employee;
};

int main() {
    Manager m("Grace");
    m.name();                    // error: 'Employee' is not an accessible base of 'Manager'
}
```

**Always write the access explicitly**, even on a `struct`, so readers don't have to remember the rule.

## Re-exposing members with `using`

With private or protected inheritance, you can make selected base members public again with a
using-declaration in the derived class's public section:

```cpp run
#include <iostream>
#include <vector>

class History : private std::vector<int> {    // implemented in terms of vector
public:
    using std::vector<int>::size;              // expose just what we want
    using std::vector<int>::empty;

    void record(int value) { push_back(value); }   // internal use of base members is fine
    int last() const { return back(); }
};

int main() {
    History h;
    h.record(3);
    h.record(8);
    std::cout << h.size() << ' ' << h.last() << '\n';
    // h.push_back(1);   // error: push_back is private in History
    // h.clear();        // error: clear is private too
}
```

```output
2 8
```

This works, but there's a cleaner way to get the same result: composition.

## Composition: "has-a"

**Composition** means building a class out of member objects. A `Car` **has an** `Engine`; it isn't
an engine. In code, the "part" is simply a member:

```cpp run
#include <iostream>
#include <string>

class Engine {
    int horsepower_;
public:
    explicit Engine(int hp) : horsepower_(hp) {}
    void start() const { std::cout << horsepower_ << "hp engine started\n"; }
};

class Car {
    std::string model_;
    Engine engine_;                       // has-a: Car contains an Engine
public:
    Car(const std::string& model, int hp) : model_(model), engine_(hp) {}
    void drive() const {
        engine_.start();                  // delegate to the part
        std::cout << model_ << " is driving\n";
    }
};

int main() {
    Car c("Roadster", 300);
    c.drive();
}
```

```output
300hp engine started
Roadster is driving
```

Here's the `History` class again, using composition instead of private inheritance. It's just as
short, and nothing about `std::vector` leaks into its interface:

```cpp run
#include <iostream>
#include <vector>

class History {
    std::vector<int> values_;                      // has-a vector
public:
    void record(int value) { values_.push_back(value); }
    int last() const { return values_.back(); }
    std::size_t size() const { return values_.size(); }
    bool empty() const { return values_.empty(); }
};

int main() {
    History h;
    h.record(3);
    h.record(8);
    std::cout << h.size() << ' ' << h.last() << '\n';
}
```

```output
2 8
```

## Prefer composition over inheritance

A famous design guideline: **favor composition over inheritance**. Use public inheritance only for
genuine "is-a" relationships where a derived object can be used anywhere a base object can (the
**Liskov substitution principle**). Reasons:

- **Looser coupling.** A member is used only through its public interface. A derived class depends on
  the base's protected internals too, so changes to the base can break every derived class (the
  "fragile base class" problem).
- **Smaller interfaces.** Public inheritance exposes *every* public base member. If `Stack` publicly
  inherited from `std::vector`, users could call `insert` in the middle and break the stack's rules.
- **Flexibility.** You can swap a member for a different implementation, hold several, or create it lazily.
- **No surprises.** Standard containers like `std::vector` have no virtual destructor and were never
  designed as base classes.

Ask the question in plain words:

| Relationship | Sounds right? | Use |
| --- | --- | --- |
| A `Circle` is a `Shape` | yes | public inheritance |
| A `Car` has an `Engine` | yes | composition |
| A `Stack` is a `vector` | no: a stack can't insert in the middle | composition |
| A `Square` is a `Rectangle` | in math yes, but if `Rectangle` has `setWidth` independent of height, a `Square` can't honor that | composition, or a common `Shape` base |

:::quiz
`class Derived : Base { };`, with no access keyword. What kind of inheritance is it?

- [ ] public
- [ ] protected
- [x] private
- [ ] It doesn't compile without a keyword

`class` defaults to private inheritance; `struct` defaults to public. Always write it explicitly.
:::

:::quiz
With `class D : protected B`, a member that is `public` in `B` is ___ in `D`.

- [ ] public
- [x] protected
- [ ] private
- [ ] inaccessible

Protected inheritance caps inherited access at protected. `B`'s private members stay inaccessible regardless.
:::

:::quiz
Which relationships are best modeled with composition (a member object) rather than public inheritance? (select all that apply)

- [x] A `Computer` and its `CPU`
- [x] A `Playlist` that stores songs in a `std::vector`
- [ ] A `SavingsAccount` and an `Account`
- [ ] A `Triangle` and a `Shape`

A computer *has a* CPU and a playlist *has a* list of songs. A savings account *is an* account, and a
triangle *is a* shape.
:::

:::exercise Fix the default access
`Manager` is supposed to be an `Employee`, but the code doesn't compile because of the default
inheritance access of `class`. Fix the class declaration (don't change `main`).

**Input:** a name and a team size.
**Output:** `NAME manages N people` from `main`.

```cpp starter broken
#include <iostream>
#include <string>

class Employee {
    std::string name_;
public:
    explicit Employee(const std::string& name) : name_(name) {}
    const std::string& name() const { return name_; }
};

class Manager : Employee {
    int teamSize_;
public:
    Manager(const std::string& name, int teamSize) : Employee(name), teamSize_(teamSize) {}
    int teamSize() const { return teamSize_; }
};

void introduce(const Employee& e, int team) {
    std::cout << e.name() << " manages " << team << " people\n";
}

int main() {
    std::string name;
    int team;
    std::cin >> name >> team;
    Manager m(name, team);
    introduce(m, m.teamSize());
}
```

```cpp solution
#include <iostream>
#include <string>

class Employee {
    std::string name_;
public:
    explicit Employee(const std::string& name) : name_(name) {}
    const std::string& name() const { return name_; }
};

class Manager : public Employee {
    int teamSize_;
public:
    Manager(const std::string& name, int teamSize) : Employee(name), teamSize_(teamSize) {}
    int teamSize() const { return teamSize_; }
};

void introduce(const Employee& e, int team) {
    std::cout << e.name() << " manages " << team << " people\n";
}

int main() {
    std::string name;
    int team;
    std::cin >> name >> team;
    Manager m(name, team);
    introduce(m, m.teamSize());
}
```

```hint
The error says `'Employee' is an inaccessible base of 'Manager'`. Which access does `class` use by default?
```

```stdin
Grace 12
```

```expected
Grace manages 12 people
```

```stdin
Solo 0
```

```expected hidden
Solo manages 0 people
```

```checks
must class\s+Manager\s*:\s*public\s+Employee :: Manager should publicly inherit from Employee.
```
:::

:::exercise Stack by composition
Implement a `Stack` of ints using **composition**: a private `std::vector<int>` member. Do **not**
inherit from anything. Provide exactly the stack operations: `push(int)`, `pop()` (does nothing when
empty), `top() const` (only called when non-empty), `empty() const`, and `size() const`.

**Input:** commands until end of input: `push X`, `pop`, `top`, `size`.
**Output:** `top` prints the top element, or `empty` if the stack is empty; `size` prints the size.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

class Stack {
public:
    void push(int) {}
    void pop() {}
    int top() const { return 0; }
    bool empty() const { return true; }
    std::size_t size() const { return 0; }
};

int main() {
    Stack s;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push") {
            int x;
            std::cin >> x;
            s.push(x);
        } else if (cmd == "pop") {
            s.pop();
        } else if (cmd == "top") {
            if (s.empty()) std::cout << "empty\n";
            else std::cout << s.top() << '\n';
        } else if (cmd == "size") {
            std::cout << s.size() << '\n';
        }
    }
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

class Stack {
    std::vector<int> items_;
public:
    void push(int x) { items_.push_back(x); }
    void pop() {
        if (!items_.empty()) items_.pop_back();
    }
    int top() const { return items_.back(); }
    bool empty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }
};

int main() {
    Stack s;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push") {
            int x;
            std::cin >> x;
            s.push(x);
        } else if (cmd == "pop") {
            s.pop();
        } else if (cmd == "top") {
            if (s.empty()) std::cout << "empty\n";
            else std::cout << s.top() << '\n';
        } else if (cmd == "size") {
            std::cout << s.size() << '\n';
        }
    }
}
```

```hint
Add `std::vector<int> items_;` as a private member and forward each operation to it (`push_back`, `pop_back`, `back`, ...).
```

```stdin
push 1
push 2
top
pop
top
size
```

```expected
2
1
1
```

```stdin
top
pop
size
push -5
top
size
```

```expected hidden
empty
0
-5
1
```

```checks
must std::vector\s*<\s*int\s*>\s+\w+\s*; :: Store the items in a std::vector<int> member.
mustnot class\s+Stack\s*: :: Don't inherit; use composition.
```
:::

:::exercise Private base, public subset
Sometimes you do want private inheritance. Write `class Scores : private std::vector<int>` that exposes
**only** `size` and `operator[]` from the vector (using-declarations), and adds:

- `void add(int s)`: stores the score, but only if `0 <= s <= 100` (others are ignored),
- `int best() const`: the highest stored score, or `-1` if there are none.

**Input:** scores until end of input.
**Output:** `count: N`, `first: F` (the first stored score, or `first: none` if empty), and `best: B`.

```cpp starter
#include <iostream>
#include <vector>

class Scores {
public:
    void add(int) {}
    int best() const { return -1; }
    std::size_t size() const { return 0; }
    int operator[](std::size_t) const { return 0; }
};

int main() {
    Scores s;
    int x;
    while (std::cin >> x) s.add(x);
    std::cout << "count: " << s.size() << '\n';
    if (s.size() > 0) std::cout << "first: " << s[0] << '\n';
    else std::cout << "first: none\n";
    std::cout << "best: " << s.best() << '\n';
}
```

```cpp solution
#include <iostream>
#include <vector>

class Scores : private std::vector<int> {
public:
    using std::vector<int>::size;
    using std::vector<int>::operator[];

    void add(int s) {
        if (s >= 0 && s <= 100) push_back(s);
    }
    int best() const {
        int b = -1;
        for (int v : *this)
            if (v > b) b = v;
        return b;
    }
};

int main() {
    Scores s;
    int x;
    while (std::cin >> x) s.add(x);
    std::cout << "count: " << s.size() << '\n';
    if (s.size() > 0) std::cout << "first: " << s[0] << '\n';
    else std::cout << "first: none\n";
    std::cout << "best: " << s.best() << '\n';
}
```

```hint
In the public section: `using std::vector<int>::size;` and `using std::vector<int>::operator[];`.
```

```hint
Inside member functions you can call `push_back(s)` directly, and iterate the inherited elements with `for (int v : *this)`.
```

```stdin
70 95 -3 101 88
```

```expected
count: 3
first: 70
best: 95
```

```stdin
200 -1
```

```expected hidden
count: 0
first: none
best: -1
```

```checks
must private\s+std::vector\s*<\s*int\s*> :: Inherit privately from std::vector<int>.
must using\s+std::vector\s*<\s*int\s*>\s*::\s*size :: Re-expose size with a using-declaration.
must using\s+std::vector\s*<\s*int\s*>\s*::\s*operator\s*\[\s*\] :: Re-expose operator[] with a using-declaration.
```
:::
