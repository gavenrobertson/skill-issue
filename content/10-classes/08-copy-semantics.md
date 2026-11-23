---
title: Copy Semantics
summary: The copy constructor and copy assignment operator, what the compiler generates, shallow vs deep copies, self-assignment, copy-and-swap, and the rule of three.
---

## Two ways to copy an object

Copying an `int` just copies its bits. Copying an object of your class calls one of two special member
functions:

| | Signature | Runs when |
| --- | --- | --- |
| **Copy constructor** | `T(const T& other)` | a **new** object is created from an existing one |
| **Copy assignment operator** | `T& operator=(const T& other)` | an **existing** object is overwritten with another |

The difference is whether the target already exists. Watch out for the `=` sign: `T b = a;` *creates*
`b`, so it calls the copy **constructor**, not assignment.

```cpp run
#include <iostream>
#include <string>

class Tracer {
    std::string name_;
public:
    explicit Tracer(const std::string& name) : name_(name) {
        std::cout << "construct " << name_ << '\n';
    }
    Tracer(const Tracer& other) : name_(other.name_ + "'") {          // copy constructor
        std::cout << "copy-construct " << name_ << " from " << other.name_ << '\n';
    }
    Tracer& operator=(const Tracer& other) {                           // copy assignment
        std::cout << "copy-assign " << other.name_ << " into " << name_ << '\n';
        name_ = other.name_ + "=";
        return *this;
    }
    ~Tracer() { std::cout << "destroy " << name_ << '\n'; }
};

void byValue(Tracer t) { std::cout << "  (inside byValue)\n"; (void)t; }
void byReference(const Tracer&) { std::cout << "  (inside byReference)\n"; }

int main() {
    Tracer a("a");
    Tracer b = a;          // copy constructor (b is new)
    Tracer c("c");
    c = a;                 // copy assignment (c already exists)
    byValue(a);            // copy constructor for the parameter
    byReference(a);        // no copy at all
    std::cout << "end of main\n";
}
```

```output
construct a
copy-construct a' from a
construct c
copy-assign a into c
copy-construct a' from a
  (inside byValue)
destroy a'
  (inside byReference)
end of main
destroy a=
destroy a'
destroy a
```

So the copy constructor runs when you:

- initialize a new object from another: `T b = a;`, `T b(a);`, `T b{a};`
- pass an object **by value** to a function,
- return a local object by value (though the compiler usually **elides** this copy, see below),
- put objects in containers (`v.push_back(a)` copies `a` into the vector).

> **Note:** **Copy elision.** When a function returns a temporary (`return Tracer("x");`) and you
> initialize from it, C++17 *guarantees* no copy happens: the object is built directly in its final
> place. Returning a named local (`Tracer t(...); return t;`) is usually elided too (NRVO), but not
> guaranteed. Don't put important side effects in copy constructors.

## The implicitly generated versions

If you don't write them, the compiler generates both for you. They copy **each member in turn**
(memberwise), using each member's own copy operation. For members like `int`, `double`,
`std::string`, and `std::vector`, that's exactly right:

```cpp run
#include <iostream>
#include <string>
#include <vector>

struct Student {
    std::string name;
    std::vector<int> grades;
};

int main() {
    Student a{"Ada", {90, 85}};
    Student b = a;              // generated copy constructor: copies name and grades
    b.name = "Bob";
    b.grades.push_back(70);
    std::cout << a.name << ' ' << a.grades.size() << '\n';   // a is unaffected
    std::cout << b.name << ' ' << b.grades.size() << '\n';
}
```

```output
Ada 2
Bob 3
```

The generated copy operations are **deleted** (unavailable) when a member can't be copied or assigned:
a `std::unique_ptr` member blocks both, and a `const` or reference member blocks copy *assignment*
(it can't be re-pointed or overwritten):

```cpp compile-error
class Badge {
    const int id_;
public:
    explicit Badge(int id) : id_(id) {}
};

int main() {
    Badge a(1), b(2);
    Badge c = a;      // OK: copy construction initializes the const member
    b = a;            // error: use of deleted function 'Badge& Badge::operator=(const Badge&)'
}
```

## Shallow vs deep copy

The trouble starts when a class **owns a resource through a raw pointer**. Memberwise copying copies
the *pointer*, not what it points to. Both objects now point at the same memory: a **shallow copy**.

```cpp
class IntArray {
    int* data_;
    std::size_t size_;
public:
    explicit IntArray(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~IntArray() { delete[] data_; }
    // no copy operations written: the compiler copies data_ and size_ memberwise
};

void broken() {
    IntArray a(3);
    IntArray b = a;     // b.data_ == a.data_  (shallow copy)
    // ...changing b's elements changes a's too...
}                       // b's destructor frees the array, then a's frees it AGAIN: undefined behavior
```

```
 a.data_ ──┐
           ├──► [ 0 | 0 | 0 ]      one array, two owners, two delete[]s
 b.data_ ──┘
```

A **deep copy** gives the new object its *own* copy of the resource:

```
 a.data_ ──► [ 0 | 0 | 0 ]
 b.data_ ──► [ 0 | 0 | 0 ]        two arrays, one owner each
```

Here's `IntArray` with correct, deep copy operations:

```cpp run
#include <algorithm>
#include <cstddef>
#include <iostream>

class IntArray {
    int* data_;
    std::size_t size_;

public:
    explicit IntArray(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~IntArray() { delete[] data_; }

    // Copy constructor: allocate our own array and copy the elements.
    IntArray(const IntArray& other) : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }

    // Copy assignment: replace our contents with a copy of other's.
    IntArray& operator=(const IntArray& other) {
        if (this == &other) return *this;           // self-assignment: nothing to do
        int* fresh = new int[other.size_];          // 1. allocate first (if this throws, *this is untouched)
        std::copy(other.data_, other.data_ + other.size_, fresh);
        delete[] data_;                             // 2. release the old array
        data_ = fresh;                              // 3. take ownership of the new one
        size_ = other.size_;
        return *this;
    }

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};

void print(IntArray& a) {
    for (std::size_t i = 0; i < a.size(); ++i) std::cout << a[i] << ' ';
    std::cout << '\n';
}

int main() {
    IntArray a(3);
    a[0] = 1; a[1] = 2; a[2] = 3;

    IntArray b = a;          // deep copy
    b[0] = 100;              // only b changes

    IntArray c(1);
    c = a;                   // deep copy assignment (c's old 1-element array is freed)
    c[2] = 300;

    print(a);
    print(b);
    print(c);
}                            // three destructors, three different arrays: no double free
```

```output
1 2 3 
100 2 3 
1 2 300 
```

## The self-assignment trap

`a = a;` looks silly, but it happens indirectly all the time: `x[i] = x[j]` when `i == j`, or
`*p = *q` when both point at the same object. A naive assignment operator breaks on it:

```cpp
IntArray& operator=(const IntArray& other) {
    delete[] data_;                          // if other IS *this, we just freed other's data too...
    data_ = new int[other.size_];
    std::copy(other.data_, other.data_ + other.size_, data_);   // ...and now read freed memory: UB
    size_ = other.size_;
    return *this;
}
```

Two ways to make it safe: check `if (this == &other) return *this;`, and/or **allocate and copy before
deleting** (as in the example above). Allocating first is the more important habit, because it also
means that if `new` throws, the object is left unchanged.

## Copy-and-swap

There's an elegant way to write assignment that is automatically safe against self-assignment and
exceptions, and reuses the copy constructor instead of duplicating it: the **copy-and-swap** idiom.

1. Take the parameter **by value**. The copy constructor makes the copy (the hard work).
2. **Swap** your contents with that copy.
3. When the function returns, the parameter (now holding your *old* contents) is destroyed, freeing them.

```cpp run
#include <algorithm>
#include <cstddef>
#include <iostream>
#include <utility>

class IntArray {
    int* data_;
    std::size_t size_;

public:
    explicit IntArray(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~IntArray() { delete[] data_; }

    IntArray(const IntArray& other) : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }

    friend void swap(IntArray& a, IntArray& b) noexcept {   // swap just exchanges pointers: cheap, can't fail
        using std::swap;
        swap(a.data_, b.data_);
        swap(a.size_, b.size_);
    }

    IntArray& operator=(IntArray other) {    // by value: 'other' is already a copy
        swap(*this, other);                  // take its contents, give it ours
        return *this;
    }                                        // 'other' dies here, freeing our old array

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};

int main() {
    IntArray a(2);
    a[0] = 7;
    a[1] = 8;
    IntArray b(5);
    b = a;
    IntArray& alias = b;
    b = alias;                               // self-assignment: still correct
    std::cout << b.size() << ": " << b[0] << ' ' << b[1] << '\n';
}
```

```output
2: 7 8
```

The trade-off: copy-and-swap **always** allocates a new copy, even when the existing buffer is big
enough to reuse. For most classes the simplicity is worth it.

## Disabling copying

Some objects shouldn't be copied at all: a file handle, a network socket, a mutex, a unique owner of
something. Delete the copy operations:

```cpp compile-error
class Socket {
public:
    Socket() = default;
    Socket(const Socket&) = delete;              // no copying
    Socket& operator=(const Socket&) = delete;
};

int main() {
    Socket a;
    Socket b = a;   // error: use of deleted function 'Socket::Socket(const Socket&)'
}
```

Such classes are often still **movable** (ownership can be *transferred*), which is the topic of the
next lesson.

## The rule of three

> If a class needs a user-written **destructor**, **copy constructor**, or **copy assignment operator**,
> it almost certainly needs **all three**.

The reasoning: if you need a custom destructor, your class manages a resource by hand, and the
generated memberwise copies will be shallow and wrong. So either implement deep copies or `= delete` them.

| You wrote | And forgot | Result |
| --- | --- | --- |
| destructor | copy constructor | two objects free the same resource: double free |
| destructor | copy assignment | the old resource leaks **and** two objects share the new one |
| copy constructor | copy assignment | `a = b` is still shallow |

In the next lesson, move semantics extend this to the **rule of five**, and you'll see the even better
**rule of zero**: design classes so they don't need any of these at all.

:::quiz
Which line calls the copy **assignment** operator?

```cpp
Widget a;
Widget b = a;   // (1)
Widget c(a);    // (2)
Widget d;
d = a;          // (3)
```

- [ ] (1)
- [ ] (2)
- [x] (3)
- [ ] All three

(1) and (2) create new objects, so they call the copy constructor, even though (1) uses `=`. Only (3)
overwrites an existing object.
:::

:::quiz
A class has a raw `char* buf_` allocated with `new[]`, a destructor that `delete[]`s it, and no copy
operations. What happens after `Text b = a;` when both go out of scope?

- [ ] Each frees its own buffer, no problem
- [x] Both free the same buffer: a double free, which is undefined behavior
- [ ] It doesn't compile
- [ ] The buffer leaks but nothing else goes wrong

The generated copy constructor copies the pointer (shallow copy). This is exactly what the rule of three warns about.
:::

:::quiz
Why does the copy-and-swap `operator=` take its parameter **by value**?

- [ ] Because references can't be swapped
- [x] So the copy constructor makes the copy; then we just swap with it and let it destroy our old data
- [ ] It's faster than a const reference in every case
- [ ] To prevent self-assignment from compiling

Passing by value reuses the copy constructor. The swap can't fail, and the old contents are freed
when the parameter is destroyed.
:::

:::exercise Copy labels
Write the copy operations for `NameTag` so copies are labeled:

- The **copy constructor** sets the new tag's name to the original's name followed by ` (copy)`.
- The **copy assignment operator** sets the name to the source's name followed by ` (assigned)`,
  and returns `*this`.

**Input:** one word, the name.
**Output:** the three names printed by `main`. For `Ada`:

```
Ada
Ada (copy)
Ada (assigned)
```

```cpp starter
#include <iostream>
#include <string>

class NameTag {
    std::string name_;
public:
    explicit NameTag(const std::string& name) : name_(name) {}
    // add the copy constructor and copy assignment operator
    const std::string& name() const { return name_; }
};

int main() {
    std::string name;
    std::cin >> name;
    NameTag a(name);
    NameTag b = a;
    NameTag c("blank");
    c = a;
    std::cout << a.name() << '\n' << b.name() << '\n' << c.name() << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

class NameTag {
    std::string name_;
public:
    explicit NameTag(const std::string& name) : name_(name) {}
    NameTag(const NameTag& other) : name_(other.name_ + " (copy)") {}
    NameTag& operator=(const NameTag& other) {
        name_ = other.name_ + " (assigned)";
        return *this;
    }
    const std::string& name() const { return name_; }
};

int main() {
    std::string name;
    std::cin >> name;
    NameTag a(name);
    NameTag b = a;
    NameTag c("blank");
    c = a;
    std::cout << a.name() << '\n' << b.name() << '\n' << c.name() << '\n';
}
```

```hint
Copy constructor: `NameTag(const NameTag& other) : name_(other.name_ + " (copy)") {}`
```

```hint
`NameTag b = a;` calls the copy constructor; `c = a;` calls copy assignment.
```

```stdin
Ada
```

```expected
Ada
Ada (copy)
Ada (assigned)
```

```stdin
x
```

```expected hidden
x
x (copy)
x (assigned)
```

```checks
must NameTag\s*\(\s*const\s+NameTag\s*&\s*\w*\s*\) :: Write a copy constructor NameTag(const NameTag&).
must operator\s*=\s*\(\s*const\s+NameTag\s*& :: Write a copy assignment operator.
```
:::

:::exercise Deep copy
This `IntArray` has hand-written copy operations that are **shallow**: they copy the pointer. Changing a
copy changes the original, and the program frees the same array twice. Rewrite both so they make
**deep** copies. The copy assignment must also handle **self-assignment** (`main` does `a = alias;`
where `alias` refers to `a`).

**Input:** `n` (at least 1), then `n` integers.
**Output:** three lines from `main`: the original, the copy with 100 added to each element, and a
second copy whose first element was set to `-1`. Elements are separated by single spaces.

```cpp starter
#include <cstddef>
#include <iostream>

class IntArray {
    int* data_;
    std::size_t size_;
public:
    explicit IntArray(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~IntArray() { delete[] data_; }

    IntArray(const IntArray& other) : data_(other.data_), size_(other.size_) {}   // shallow!
    IntArray& operator=(const IntArray& other) {                                    // shallow!
        data_ = other.data_;
        size_ = other.size_;
        return *this;
    }

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};

void print(IntArray& a) {
    for (std::size_t i = 0; i < a.size(); ++i) std::cout << (i ? " " : "") << a[i];
    std::cout << '\n';
}

int main() {
    std::size_t n;
    std::cin >> n;
    IntArray a(n);
    for (std::size_t i = 0; i < n; ++i) std::cin >> a[i];

    IntArray b = a;
    for (std::size_t i = 0; i < b.size(); ++i) b[i] += 100;

    IntArray c(1);
    c = a;
    c[0] = -1;

    IntArray& alias = a;
    a = alias;

    print(a);
    print(b);
    print(c);
}
```

```cpp solution
#include <algorithm>
#include <cstddef>
#include <iostream>

class IntArray {
    int* data_;
    std::size_t size_;
public:
    explicit IntArray(std::size_t n) : data_(new int[n]{}), size_(n) {}
    ~IntArray() { delete[] data_; }

    IntArray(const IntArray& other) : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    IntArray& operator=(const IntArray& other) {
        if (this == &other) return *this;
        int* fresh = new int[other.size_];
        std::copy(other.data_, other.data_ + other.size_, fresh);
        delete[] data_;
        data_ = fresh;
        size_ = other.size_;
        return *this;
    }

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};

void print(IntArray& a) {
    for (std::size_t i = 0; i < a.size(); ++i) std::cout << (i ? " " : "") << a[i];
    std::cout << '\n';
}

int main() {
    std::size_t n;
    std::cin >> n;
    IntArray a(n);
    for (std::size_t i = 0; i < n; ++i) std::cin >> a[i];

    IntArray b = a;
    for (std::size_t i = 0; i < b.size(); ++i) b[i] += 100;

    IntArray c(1);
    c = a;
    c[0] = -1;

    IntArray& alias = a;
    a = alias;

    print(a);
    print(b);
    print(c);
}
```

```hint
The copy constructor must allocate: `data_(new int[other.size_])`, then copy the elements (a loop or `std::copy` from `<algorithm>`).
```

```hint
In `operator=`: return early if `this == &other`. Otherwise allocate a new array, copy into it, `delete[]` the old one, and only then update `data_` and `size_`.
```

```stdin
3
1 2 3
```

```expected
1 2 3
101 102 103
-1 2 3
```

```stdin
1
0
```

```expected hidden
0
100
-1
```

```checks
must new\s+int\s*\[\s*other\.size_ :: Allocate a new array of other.size_ elements for the copy.
must operator\s*=\s*\(\s*const\s+IntArray\s*& :: Keep a copy assignment operator taking const IntArray&.
must this\s*[!=]=\s*&\s*other|&\s*other\s*[!=]=\s*this :: Check for self-assignment (this == &other).
```
:::

:::exercise Snapshot stack
`IntStack` stores ints in a raw, growable heap array. It has a destructor but **no copy operations**,
so copies are shallow and the program misbehaves. Add:

- a deep-copying **copy constructor**,
- a `friend void swap(IntStack&, IntStack&) noexcept`,
- a **copy-and-swap** assignment operator that takes its parameter **by value**.

**Input:** commands until end of input:
`push X`, `pop` (ignored when empty), `save` (store a copy of the current stack), `restore` (replace the
current stack with a copy of the saved one; the saved copy stays), `print`.
**Output:** for each `print`, the elements from bottom to top separated by spaces, or `empty`.

```cpp starter
#include <cstddef>
#include <iostream>
#include <string>
#include <utility>

class IntStack {
    int* data_ = nullptr;
    std::size_t size_ = 0;
    std::size_t capacity_ = 0;

public:
    IntStack() = default;
    ~IntStack() { delete[] data_; }

    // TODO: copy constructor, swap, copy-and-swap operator=

    void push(int x) {
        if (size_ == capacity_) {
            std::size_t newCap = capacity_ == 0 ? 2 : capacity_ * 2;
            int* bigger = new int[newCap];
            for (std::size_t i = 0; i < size_; ++i) bigger[i] = data_[i];
            delete[] data_;
            data_ = bigger;
            capacity_ = newCap;
        }
        data_[size_++] = x;
    }
    void pop() {
        if (size_ > 0) --size_;
    }
    void print() const {
        if (size_ == 0) std::cout << "empty";
        for (std::size_t i = 0; i < size_; ++i) std::cout << (i ? " " : "") << data_[i];
        std::cout << '\n';
    }
};

int main() {
    IntStack current, saved;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push") {
            int x;
            std::cin >> x;
            current.push(x);
        } else if (cmd == "pop") {
            current.pop();
        } else if (cmd == "save") {
            saved = current;
        } else if (cmd == "restore") {
            current = saved;
        } else if (cmd == "print") {
            current.print();
        }
    }
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <string>
#include <utility>

class IntStack {
    int* data_ = nullptr;
    std::size_t size_ = 0;
    std::size_t capacity_ = 0;

public:
    IntStack() = default;
    ~IntStack() { delete[] data_; }

    IntStack(const IntStack& other)
        : data_(other.capacity_ ? new int[other.capacity_] : nullptr),
          size_(other.size_),
          capacity_(other.capacity_) {
        for (std::size_t i = 0; i < size_; ++i) data_[i] = other.data_[i];
    }

    friend void swap(IntStack& a, IntStack& b) noexcept {
        using std::swap;
        swap(a.data_, b.data_);
        swap(a.size_, b.size_);
        swap(a.capacity_, b.capacity_);
    }

    IntStack& operator=(IntStack other) {
        swap(*this, other);
        return *this;
    }

    void push(int x) {
        if (size_ == capacity_) {
            std::size_t newCap = capacity_ == 0 ? 2 : capacity_ * 2;
            int* bigger = new int[newCap];
            for (std::size_t i = 0; i < size_; ++i) bigger[i] = data_[i];
            delete[] data_;
            data_ = bigger;
            capacity_ = newCap;
        }
        data_[size_++] = x;
    }
    void pop() {
        if (size_ > 0) --size_;
    }
    void print() const {
        if (size_ == 0) std::cout << "empty";
        for (std::size_t i = 0; i < size_; ++i) std::cout << (i ? " " : "") << data_[i];
        std::cout << '\n';
    }
};

int main() {
    IntStack current, saved;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "push") {
            int x;
            std::cin >> x;
            current.push(x);
        } else if (cmd == "pop") {
            current.pop();
        } else if (cmd == "save") {
            saved = current;
        } else if (cmd == "restore") {
            current = saved;
        } else if (cmd == "print") {
            current.print();
        }
    }
}
```

```hint
The copy constructor allocates `new int[other.capacity_]` (or keeps `nullptr` if the capacity is 0) and copies the first `size_` elements.
```

```hint
`swap` exchanges all three members with `std::swap`. Then: `IntStack& operator=(IntStack other) { swap(*this, other); return *this; }`.
```

```stdin
push 1
push 2
save
push 3
print
restore
print
pop
print
restore
push 9
print
```

```expected
1 2 3
1 2
1
1 2 9
```

```stdin
print
save
push 5
print
restore
print
```

```expected hidden
empty
5
empty
```

```checks
must IntStack\s*\(\s*const\s+IntStack\s*& :: Write a copy constructor.
must \bswap\s*\(\s*\*\s*this :: Swap *this with the by-value parameter.
must operator\s*=\s*\(\s*IntStack\s+\w+\s*\) :: Take the operator= parameter by value (copy-and-swap).
```
:::
