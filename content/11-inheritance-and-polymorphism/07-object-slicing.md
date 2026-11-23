---
title: Object Slicing
summary: What happens when a derived object is copied into a base object by value, the partial-assignment bug, and how references, pointers, protected copy operations, and clone() prevent it.
---

## Copying a derived object into a base object

A `Base` variable is exactly big enough to hold a `Base`. So what happens if you copy a `Derived` into
one? The compiler uses `Base`'s copy constructor, which copies **only the base part**. The derived
members are cut off, and the new object is a plain `Base` through and through, including its vtable.
This is **object slicing**.

```cpp run
#include <iostream>
#include <string>

class Animal {
protected:
    std::string name_;
public:
    explicit Animal(std::string n) : name_(std::move(n)) {}
    virtual ~Animal() = default;
    virtual std::string describe() const { return name_ + " (some animal)"; }
};

class Dog : public Animal {
    std::string breed_;
public:
    Dog(std::string n, std::string b) : Animal(std::move(n)), breed_(std::move(b)) {}
    std::string describe() const override { return name_ + " the " + breed_; }
};

int main() {
    Dog d("Rex", "beagle");

    Animal a = d;              // SLICED: only the Animal part is copied
    Animal& r = d;             // no copy: r refers to the whole Dog

    std::cout << d.describe() << '\n';
    std::cout << a.describe() << '\n';    // Animal::describe. a has no breed_ at all
    std::cout << r.describe() << '\n';
}
```

```output
Rex the beagle
Rex (some animal)
Rex the beagle
```

```
  Dog d                         Animal a = d;
 ┌──────────────┐              ┌──────────────┐
 │ name_ "Rex"  │ ──copied──►  │ name_ "Rex"  │
 ├──────────────┤              └──────────────┘
 │ breed_       │   (sliced off, lost)
 └──────────────┘
```

Slicing isn't a compile error; it's legal C++ that's almost never what you want with polymorphic types.

## Where slicing sneaks in

**Passing by value:**

```cpp run
#include <iostream>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }
};

class Square : public Shape {
    double s_;
public:
    explicit Square(double s) : s_(s) {}
    double area() const override { return s_ * s_; }
};

void printByValue(Shape s)            { std::cout << "by value:     " << s.area() << '\n'; }
void printByRef(const Shape& s)       { std::cout << "by reference: " << s.area() << '\n'; }

int main() {
    Square sq(3);
    printByValue(sq);    // the parameter is a sliced copy
    printByRef(sq);      // no copy, virtual dispatch works
}
```

```output
by value:     0
by reference: 9
```

**Storing in a container by value:**

```cpp
std::vector<Shape> shapes;
shapes.push_back(Square(3));     // stores a sliced Shape
shapes[0].area();                // 0
```

**Catching exceptions by value** (`catch (std::exception e)`) slices too, which is why you always catch
by reference: `catch (const std::exception& e)`.

## The partial-assignment bug

Slicing also happens through **assignment via a base reference**, and this one is nastier, because the
result is a corrupt mix of two objects. `Base::operator=` isn't virtual, so it copies only the base part:

```cpp run
#include <iostream>
#include <string>

class Animal {
protected:
    std::string name_;
public:
    explicit Animal(std::string n) : name_(std::move(n)) {}
    virtual ~Animal() = default;
    Animal(const Animal&) = default;
    Animal& operator=(const Animal&) = default;
    virtual std::string describe() const { return name_; }
};

class Dog : public Animal {
    std::string breed_;
public:
    Dog(std::string n, std::string b) : Animal(std::move(n)), breed_(std::move(b)) {}
    std::string describe() const override { return name_ + " the " + breed_; }
};

int main() {
    Dog rex("Rex", "beagle");
    Dog luna("Luna", "husky");

    Animal& ref = rex;
    ref = luna;                          // Animal::operator=: copies only the name

    std::cout << rex.describe() << '\n'; // a Frankenstein dog
}
```

```output
Luna the beagle
```

`rex` now has Luna's name and its own breed: half of one object, half of the other.

## How to avoid slicing

**1. Handle polymorphic objects through references and pointers.** Pass `const Base&` (or `Base*`),
never `Base` by value. Store `std::unique_ptr<Base>` in containers.

**2. Make the base class abstract.** You can't create an object of an abstract class, so `Shape s = sq;`,
by-value `Shape` parameters, and `std::vector<Shape>` all become compile errors. (This doesn't stop the
partial-assignment bug through a reference, though.)

**3. Disable public copying in the polymorphic base.** If the base's copy operations are deleted or
protected, any slicing copy or assignment through the base fails to compile:

```cpp compile-error
class Shape {
public:
    Shape() = default;
    virtual ~Shape() = default;
    Shape(const Shape&) = delete;              // no copies through Shape
    Shape& operator=(const Shape&) = delete;
    virtual double area() const { return 0; }
};

class Square : public Shape {};

void print(Shape s);                           // declaring is fine...

int main() {
    Square a, b;
    Shape s = a;                               // error: use of deleted function 'Shape::Shape(const Shape&)'
    Shape& r = a;
    r = b;                                     // error: use of deleted function 'Shape& Shape::operator=(const Shape&)'
    print(a);                                  // error: copying the argument needs the deleted constructor
}
```

The catch: deleting the base's copy constructor also stops `Square` from being copied (a `Square` copy
needs to copy its `Shape` part). If derived classes should still be copyable, make the base's copy
operations **`protected`** and `= default` instead: derived classes can use them, outside code can't.

## Copying polymorphic objects: `clone()`

Sometimes you really do need a copy of "whatever this shape is" when all you have is a `Shape&`. Copying
through the base can't work (it slices). The solution is a **virtual `clone()` function**: each class
knows its own type, so it can copy itself correctly and return the copy through a base pointer. This is
sometimes called a **virtual constructor**.

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
protected:
    Shape(const Shape&) = default;                 // derived classes may copy their base part...
    Shape& operator=(const Shape&) = default;      // ...outside code can't slice
public:
    Shape() = default;
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
    virtual std::string describe() const = 0;
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);    // copy *this as a Circle: nothing is sliced
    }
    std::string describe() const override { return "circle r=" + std::to_string(static_cast<int>(r_)); }
};

class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Rect>(*this); }
    std::string describe() const override {
        return "rect " + std::to_string(static_cast<int>(w_)) + "x" + std::to_string(static_cast<int>(h_));
    }
};

int main() {
    std::vector<std::unique_ptr<Shape>> original;
    original.push_back(std::make_unique<Circle>(2));
    original.push_back(std::make_unique<Rect>(3, 4));

    std::vector<std::unique_ptr<Shape>> copy;
    for (const auto& s : original) copy.push_back(s->clone());   // deep, type-correct copies

    for (const auto& s : copy) std::cout << s->describe() << '\n';
}
```

```output
circle r=2
rect 3x4
```

`std::make_unique<Circle>(*this)` calls `Circle`'s copy constructor, which (being a member of a derived
class) is allowed to use `Shape`'s protected copy constructor for the base part.

:::quiz
What does this print?

```cpp
struct A { virtual char id() const { return 'A'; } virtual ~A() = default; };
struct B : A { char id() const override { return 'B'; } };
void show(A a) { std::cout << a.id(); }
int main() { B b; show(b); std::cout << b.id(); }
```

- [ ] `BB`
- [x] `AB`
- [ ] `AA`
- [ ] It doesn't compile

`show` takes an `A` **by value**, so its parameter is a sliced copy of type `A`. Calling `b.id()` directly gives `B`.
:::

:::quiz
Which of these prevent slicing? (select all that apply)

- [x] Passing polymorphic objects as `const Base&`
- [x] Storing `std::unique_ptr<Base>` in containers instead of `Base`
- [x] Deleting or protecting the base class's copy constructor and copy assignment
- [ ] Making the base class's member functions `const`

`const` on member functions has nothing to do with copying. The other three avoid copying the object as a `Base`.
:::

:::exercise Stop the slicing {easy}
`announce` takes its `Animal` **by value**, so every animal is sliced and says `...`. Change only the
parameter of `announce` so that the real `speak()` is called.

**Input:** lines until end of input, each `dog NAME`, `cat NAME`, or `cow NAME`.
**Output:** `NAME says SOUND` for each, where the sound is `Woof`, `Meow`, or `Moo`.

```cpp starter
#include <iostream>
#include <string>

class Animal {
protected:
    std::string name_;
public:
    explicit Animal(std::string n) : name_(std::move(n)) {}
    virtual ~Animal() = default;
    virtual std::string speak() const { return "..."; }
    const std::string& name() const { return name_; }
};

class Dog : public Animal { public: using Animal::Animal; std::string speak() const override { return "Woof"; } };
class Cat : public Animal { public: using Animal::Animal; std::string speak() const override { return "Meow"; } };
class Cow : public Animal { public: using Animal::Animal; std::string speak() const override { return "Moo"; } };

void announce(Animal a) {
    std::cout << a.name() << " says " << a.speak() << '\n';
}

int main() {
    std::string kind, name;
    while (std::cin >> kind >> name) {
        if (kind == "dog") announce(Dog(name));
        else if (kind == "cat") announce(Cat(name));
        else announce(Cow(name));
    }
}
```

```cpp solution
#include <iostream>
#include <string>

class Animal {
protected:
    std::string name_;
public:
    explicit Animal(std::string n) : name_(std::move(n)) {}
    virtual ~Animal() = default;
    virtual std::string speak() const { return "..."; }
    const std::string& name() const { return name_; }
};

class Dog : public Animal { public: using Animal::Animal; std::string speak() const override { return "Woof"; } };
class Cat : public Animal { public: using Animal::Animal; std::string speak() const override { return "Meow"; } };
class Cow : public Animal { public: using Animal::Animal; std::string speak() const override { return "Moo"; } };

void announce(const Animal& a) {
    std::cout << a.name() << " says " << a.speak() << '\n';
}

int main() {
    std::string kind, name;
    while (std::cin >> kind >> name) {
        if (kind == "dog") announce(Dog(name));
        else if (kind == "cat") announce(Cat(name));
        else announce(Cow(name));
    }
}
```

```hint
A `const Animal&` parameter refers to the whole original object instead of copying its `Animal` part.
```

```stdin
dog Rex
cat Tom
cow Bessie
```

```expected
Rex says Woof
Tom says Meow
Bessie says Moo
```

```stdin
cow Moo
```

```expected hidden
Moo says Moo
```

```checks
must announce\s*\(\s*const\s+Animal\s*& :: Take the Animal by const reference.
```
:::

:::exercise Unslice the vector {easy}
This program stores shapes in a `std::vector<Shape>`, so every circle and rectangle is sliced into a
plain `Shape` with area 0. Fix it by storing `std::unique_ptr<Shape>` instead, and make `Shape::area`
**pure virtual** so this mistake can't compile again.

**Input:** `n`, then `n` lines `circle R` or `rect W H`.
**Output:** each area on its own line with 2 decimals (π = `3.14159265358979`), then `largest: A`, the
largest area with 2 decimals (`largest: 0.00` if `n` is 0).

```cpp starter
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0; }
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159265358979 * r_ * r_; }
};

class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Shape> shapes;
    for (int i = 0; i < n; ++i) {
        std::string kind;
        std::cin >> kind;
        if (kind == "circle") {
            double r;
            std::cin >> r;
            shapes.push_back(Circle(r));
        } else {
            double w, h;
            std::cin >> w >> h;
            shapes.push_back(Rect(w, h));
        }
    }
    std::cout << std::fixed << std::setprecision(2);
    double largest = 0;
    for (const Shape& s : shapes) {
        std::cout << s.area() << '\n';
        if (s.area() > largest) largest = s.area();
    }
    std::cout << "largest: " << largest << '\n';
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.14159265358979 * r_ * r_; }
};

class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
};

int main() {
    int n;
    std::cin >> n;
    std::vector<std::unique_ptr<Shape>> shapes;
    for (int i = 0; i < n; ++i) {
        std::string kind;
        std::cin >> kind;
        if (kind == "circle") {
            double r;
            std::cin >> r;
            shapes.push_back(std::make_unique<Circle>(r));
        } else {
            double w, h;
            std::cin >> w >> h;
            shapes.push_back(std::make_unique<Rect>(w, h));
        }
    }
    std::cout << std::fixed << std::setprecision(2);
    double largest = 0;
    for (const auto& s : shapes) {
        std::cout << s->area() << '\n';
        if (s->area() > largest) largest = s->area();
    }
    std::cout << "largest: " << largest << '\n';
}
```

```hint
Change the vector to `std::vector<std::unique_ptr<Shape>>` and add elements with `std::make_unique<Circle>(r)`.
```

```hint
In the loop, the elements are now smart pointers: use `const auto& s` and `s->area()`.
```

```stdin
3
circle 1
rect 2 5
circle 2
```

```expected
3.14
10.00
12.57
largest: 12.57
```

```stdin
0
```

```expected hidden
largest: 0.00
```

```checks
must std::vector\s*<\s*std::unique_ptr\s*<\s*Shape\s*>\s*> :: Store std::unique_ptr<Shape> in the vector.
mustnot std::vector\s*<\s*Shape\s*> :: A vector<Shape> slices every element.
must area\s*\(\s*\)\s*const\s*=\s*0 :: Make Shape::area pure virtual.
```
:::

:::exercise Polymorphic clone {medium}
Give the `Shape` hierarchy a **virtual `clone()`** that returns a `std::unique_ptr<Shape>` holding a
copy of the real object. `main` clones every shape, scales the **copies** by a factor, and prints both
lists, so the originals must stay unchanged.

**Input:** a scale factor `k` (integer), then lines until end of input: `circle R` or `rect W H` (integers).
**Output:** `originals:` followed by each original's `describe()`, then `copies:` followed by each
copy's `describe()` after scaling. Formats: `circle r=R` and `rect WxH`.

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string describe() const = 0;
    virtual void scale(long long k) = 0;
    // add a pure virtual clone()
};

class Circle : public Shape {
    long long r_;
public:
    explicit Circle(long long r) : r_(r) {}
    std::string describe() const override { return "circle r=" + std::to_string(r_); }
    void scale(long long k) override { r_ *= k; }
};

class Rect : public Shape {
    long long w_, h_;
public:
    Rect(long long w, long long h) : w_(w), h_(h) {}
    std::string describe() const override { return "rect " + std::to_string(w_) + "x" + std::to_string(h_); }
    void scale(long long k) override { w_ *= k; h_ *= k; }
};

int main() {
    long long k;
    std::cin >> k;
    std::vector<std::unique_ptr<Shape>> shapes;
    std::string kind;
    while (std::cin >> kind) {
        if (kind == "circle") {
            long long r;
            std::cin >> r;
            shapes.push_back(std::make_unique<Circle>(r));
        } else {
            long long w, h;
            std::cin >> w >> h;
            shapes.push_back(std::make_unique<Rect>(w, h));
        }
    }
    std::vector<std::unique_ptr<Shape>> copies;
    // for each shape: copies.push_back(s->clone());
    for (auto& c : copies) c->scale(k);

    std::cout << "originals:\n";
    for (const auto& s : shapes) std::cout << s->describe() << '\n';
    std::cout << "copies:\n";
    for (const auto& c : copies) std::cout << c->describe() << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string describe() const = 0;
    virtual void scale(long long k) = 0;
    virtual std::unique_ptr<Shape> clone() const = 0;
};

class Circle : public Shape {
    long long r_;
public:
    explicit Circle(long long r) : r_(r) {}
    std::string describe() const override { return "circle r=" + std::to_string(r_); }
    void scale(long long k) override { r_ *= k; }
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
};

class Rect : public Shape {
    long long w_, h_;
public:
    Rect(long long w, long long h) : w_(w), h_(h) {}
    std::string describe() const override { return "rect " + std::to_string(w_) + "x" + std::to_string(h_); }
    void scale(long long k) override { w_ *= k; h_ *= k; }
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Rect>(*this); }
};

int main() {
    long long k;
    std::cin >> k;
    std::vector<std::unique_ptr<Shape>> shapes;
    std::string kind;
    while (std::cin >> kind) {
        if (kind == "circle") {
            long long r;
            std::cin >> r;
            shapes.push_back(std::make_unique<Circle>(r));
        } else {
            long long w, h;
            std::cin >> w >> h;
            shapes.push_back(std::make_unique<Rect>(w, h));
        }
    }
    std::vector<std::unique_ptr<Shape>> copies;
    for (const auto& s : shapes) copies.push_back(s->clone());
    for (auto& c : copies) c->scale(k);

    std::cout << "originals:\n";
    for (const auto& s : shapes) std::cout << s->describe() << '\n';
    std::cout << "copies:\n";
    for (const auto& c : copies) std::cout << c->describe() << '\n';
}
```

```hint
Base: `virtual std::unique_ptr<Shape> clone() const = 0;`. Each derived class: `return std::make_unique<Circle>(*this);` (with its own type).
```

```stdin
3
circle 2
rect 1 5
```

```expected
originals:
circle r=2
rect 1x5
copies:
circle r=6
rect 3x15
```

```stdin
10
```

```expected hidden
originals:
copies:
```

```stdin
0
rect 7 8
```

```expected hidden
originals:
rect 7x8
copies:
rect 0x0
```

```checks
must clone\s*\(\s*\)\s*const\s*=\s*0 :: Declare clone() as a pure virtual function in Shape.
must clone\s*\(\s*\)\s*const\s+override :: Override clone() in each shape.
must make_unique\s*<\s*\w+\s*>\s*\(\s*\*\s*this\s*\) :: Copy the real object with std::make_unique<T>(*this).
```
:::
