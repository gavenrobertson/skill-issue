---
title: "Pointers & References: Challenges"
summary: Hard problems for pointers, references and manual memory - your own C string functions, a growable array, a circular linked list, and the two-pointer technique.
---

These problems are meant to be **hard**. They combine pointers, pointer arithmetic, references,
`new`/`delete` and function design with the arrays and strings from earlier modules. Each comes with a
precise specification, and the starters are nearly empty, so the design is up to you.

Give every problem a real attempt before you look at the hints, and test the edge cases yourself: empty
input, a single element, the first and last positions. With pointers, a solution that "works on the
example" can still be wrong; undefined behavior often hides until the input changes.

:::quiz
What does this print?

```cpp
int a[4] = {10, 20, 30, 40};
int* p = a + 1;
int& r = *p;
p += 2;
r += *p;
*p++ = 1;
std::cout << a[0] << ' ' << a[1] << ' ' << a[2] << ' ' << a[3] << ' ' << (p - a);
```

- [ ] `10 20 30 1 4`
- [x] `10 60 30 1 4`
- [ ] `10 60 30 41 3`
- [ ] `10 60 1 40 3`

`r` is bound to `a[1]` once and for all: moving `p` later doesn't re-seat it. After `p += 2`, `p`
points at `a[3]`, so `r += *p` makes `a[1]` 60. `*p++ = 1` is `*(p++) = 1`: it writes 1 into `a[3]` and
then moves `p` one past the end, which is legal to form and to subtract (`p - a` is 4).
:::

:::quiz
What does this print?

```cpp
void f(int* p) { p = nullptr; }
void g(int*& p) { p = nullptr; }

int x = 5;
int* a = &x;
int* b = &x;
f(a);
g(b);
std::cout << (a != nullptr) << (b != nullptr);
```

- [ ] `00`
- [x] `10`
- [ ] `01`
- [ ] `11`

`f` receives a **copy** of the pointer, so setting it to `nullptr` only changes the copy. `g` receives a
**reference to the pointer** (`int*&`), so it changes the caller's `b` itself.
:::

:::exercise C string toolkit {hard}
Write your own versions of the classic C string functions, using **pointers** to walk the characters:

```cpp
std::size_t myLen(const char* s);               // number of chars before the '\0'
void myCopy(char* dest, const char* src);       // copy src, including its '\0', into dest
void myCat(char* dest, const char* src);        // append src to the end of dest
void myReverse(char* s);                        // reverse s in place
int myCompare(const char* a, const char* b);    // -1, 0 or 1, comparing character codes
```

Then use them on a buffer `char buffer[1001]` that starts empty. Each input line is a command; `TEXT`
is everything after the first space (a line with just the command has an empty `TEXT`):

| Command | Effect |
| --- | --- |
| `set TEXT` | copy `TEXT` into the buffer |
| `append TEXT` | append `TEXT` to the buffer |
| `reverse` | reverse the buffer |
| `length` | print the buffer's length |
| `compare TEXT` | print `myCompare(buffer, TEXT)` |
| `print` | print the buffer inside square brackets, like `[hello]` |

Don't use `<cstring>` or any `std::` algorithms. The buffer never holds more than 1000 characters.

**Input:** one command per line, until the end of input.
**Output:** one line for each `length`, `compare` and `print`.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>

std::size_t myLen(const char* s) {
    const char* p = s;
    while (*p != '\0') {
        ++p;
    }
    return static_cast<std::size_t>(p - s);   // pointer difference = number of chars
}

void myCopy(char* dest, const char* src) {
    while (*src != '\0') {
        *dest = *src;
        ++dest;
        ++src;
    }
    *dest = '\0';                              // the terminator is part of the copy
}

void myCat(char* dest, const char* src) {
    while (*dest != '\0') {
        ++dest;                                // find the end of dest...
    }
    myCopy(dest, src);                         // ...and copy src there
}

void myReverse(char* s) {
    char* left = s;
    char* right = s + myLen(s);                // one past the last char
    while (right - left > 1) {
        --right;
        char tmp = *left;
        *left = *right;
        *right = tmp;
        ++left;
    }
}

int myCompare(const char* a, const char* b) {
    while (*a != '\0' && *a == *b) {
        ++a;
        ++b;
    }
    unsigned char ca = static_cast<unsigned char>(*a);
    unsigned char cb = static_cast<unsigned char>(*b);
    if (ca == cb) return 0;
    return ca < cb ? -1 : 1;
}

int main() {
    char buffer[1001] = "";
    std::string line;
    while (std::getline(std::cin, line)) {
        std::size_t space = line.find(' ');
        std::string command = line.substr(0, space);
        std::string text = space == std::string::npos ? "" : line.substr(space + 1);

        if (command == "set") myCopy(buffer, text.c_str());
        else if (command == "append") myCat(buffer, text.c_str());
        else if (command == "reverse") myReverse(buffer);
        else if (command == "length") std::cout << myLen(buffer) << '\n';
        else if (command == "compare") std::cout << myCompare(buffer, text.c_str()) << '\n';
        else if (command == "print") std::cout << '[' << buffer << "]\n";
    }
}
```

```hint
Every function is a loop that moves a pointer until it reaches a `'\0'`. `myLen` can return the
difference between the final pointer and the start.
```

```hint
`myCopy` must also write the terminator. `myCat` is "walk `dest` to its `'\0'`, then copy `src` from
there". `myReverse` needs two pointers moving toward each other; think about the empty string and a
single character.
```

```hint
In `myCompare`, stop at the first difference or at the end of `a`. If `a` is a prefix of `b`, the
comparison ends with `'\0'` (0) against a real character, so the prefix comes first automatically.
```

```stdin
set hello
append , world
print
length
reverse
print
```

```expected
[hello, world]
12
[dlrow ,olleh]
```

```stdin
print
length
compare
compare a
set abc
compare abc
compare abd
compare ab
```

```expected
[]
0
0
-1
0
-1
1
```

```stdin
reverse
print
set x
reverse
print
set abcd
reverse
print
append
print
set
print
```

```expected hidden
[]
[x]
[dcba]
[dcba]
[]
```

```stdin
set a b
append  c
append d
print
length
compare a b  cd
compare a b cd
compare A
```

```expected hidden
[a b cd]
6
1
0
1
```

```checks
must std::size_t\s+myLen\s*\(\s*const\s+char\s*\* :: Write std::size_t myLen(const char* s).
must void\s+myCopy\s*\(\s*char\s*\*\s*\w+\s*,\s*const\s+char\s*\* :: Write void myCopy(char* dest, const char* src).
must void\s+myCat\s*\(\s*char\s*\*\s*\w+\s*,\s*const\s+char\s*\* :: Write void myCat(char* dest, const char* src).
must void\s+myReverse\s*\(\s*char\s*\* :: Write void myReverse(char* s).
must int\s+myCompare\s*\(\s*const\s+char\s*\*\s*\w+\s*,\s*const\s+char\s*\* :: Write int myCompare(const char* a, const char* b).
mustnot \bstr(len|cpy|ncpy|cat|ncat|cmp|ncmp)\s*\(|std::reverse|std::swap|<cstring> :: Write the string functions yourself.
```
:::

:::exercise Growable array {hard}
Implement the core of `std::vector` by hand, with a raw heap array and `new[]`/`delete[]`. Keep three
variables, `int* data`, `int size` and `int capacity`, and pass them to your functions **by reference**
where the function has to change them (yes, `int*& data` is a reference to a pointer).

Start with `capacity = 1` (`data = new int[1]`) and `size = 0`. The rules for the capacity are exact,
because the `stats` command prints it:

- **Growing:** before adding an element to a full array (`size == capacity`), move the elements into a
  new array with **twice** the capacity.
- **Shrinking:** after removing an element, if `capacity > 1` and `size * 4 <= capacity`, move the
  elements into a new array with **half** the capacity.

Commands, until the input ends:

| Command | Effect |
| --- | --- |
| `push X` | add `X` at the end |
| `pop` | remove the last element, or print `empty` |
| `insert I X` | insert `X` before position `I` (`0 <= I <= size`; `I == size` appends) |
| `erase I` | remove the element at position `I` (`0 <= I < size`) |
| `get I` | print the element at position `I` (`0 <= I < size`) |
| `print` | print all elements separated by spaces, or `(empty)` |
| `stats` | print `size=<size> capacity=<capacity>` |

Any invalid position prints `bad index` and changes nothing. Free the array at the end.

**Input:** at most 1000 commands.
**Output:** one line for each `get`, `print`, `stats` and failed command.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>

// Moves the elements into a new heap array with room for newCapacity elements.
void reallocate(int*& data, int size, int& capacity, int newCapacity) {
    int* fresh = new int[newCapacity];
    for (int i = 0; i < size; ++i) {
        fresh[i] = data[i];
    }
    delete[] data;
    data = fresh;
    capacity = newCapacity;
}

void insertAt(int*& data, int& size, int& capacity, int index, int value) {
    if (size == capacity) {
        reallocate(data, size, capacity, capacity * 2);
    }
    for (int i = size; i > index; --i) {
        data[i] = data[i - 1];               // shift the tail right to open a gap
    }
    data[index] = value;
    ++size;
}

void eraseAt(int*& data, int& size, int& capacity, int index) {
    for (int i = index; i + 1 < size; ++i) {
        data[i] = data[i + 1];               // shift the tail left over the gap
    }
    --size;
    if (capacity > 1 && size * 4 <= capacity) {
        reallocate(data, size, capacity, capacity / 2);
    }
}

int main() {
    int capacity = 1;
    int size = 0;
    int* data = new int[capacity];

    std::string command;
    while (std::cin >> command) {
        if (command == "push") {
            int x;
            std::cin >> x;
            insertAt(data, size, capacity, size, x);
        } else if (command == "pop") {
            if (size == 0) std::cout << "empty\n";
            else eraseAt(data, size, capacity, size - 1);
        } else if (command == "insert") {
            int index, x;
            std::cin >> index >> x;
            if (index < 0 || index > size) std::cout << "bad index\n";
            else insertAt(data, size, capacity, index, x);
        } else if (command == "erase" || command == "get") {
            int index;
            std::cin >> index;
            if (index < 0 || index >= size) std::cout << "bad index\n";
            else if (command == "erase") eraseAt(data, size, capacity, index);
            else std::cout << data[index] << '\n';
        } else if (command == "print") {
            if (size == 0) std::cout << "(empty)";
            for (int i = 0; i < size; ++i) {
                std::cout << data[i] << (i + 1 < size ? " " : "");
            }
            std::cout << '\n';
        } else if (command == "stats") {
            std::cout << "size=" << size << " capacity=" << capacity << '\n';
        }
    }
    delete[] data;
}
```

```hint
Write one helper `void reallocate(int*& data, int size, int& capacity, int newCapacity)` that allocates
the new array, copies `size` elements, `delete[]`s the old one and updates `data` and `capacity`. Both
growing and shrinking use it.
```

```hint
`insert` shifts elements from the back towards the front (`data[i] = data[i - 1]` for `i` from `size`
down to `index + 1`), so nothing is overwritten before it's moved. `erase` shifts from the front
towards the back. `push` is just `insert` at position `size`, and `pop` is `erase` at `size - 1`.
```

```hint
Check positions before touching the array. Note the different limits: `insert` accepts `I == size`, but
`erase` and `get` don't.
```

```stdin
push 10
stats
push 20
stats
push 30
stats
print
get 1
get 3
```

```expected
size=1 capacity=1
size=2 capacity=2
size=3 capacity=4
10 20 30
20
bad index
```

```stdin
insert 0 5
insert 1 7
insert 0 3
insert 2 6
print
insert 5 1
erase 4
erase 0
print
stats
```

```expected
3 5 6 7
bad index
bad index
5 6 7
size=3 capacity=4
```

```stdin
push 1
push 2
push 3
push 4
push 5
stats
pop
pop
pop
stats
pop
stats
pop
stats
pop
print
stats
```

```expected hidden
size=5 capacity=8
size=2 capacity=4
size=1 capacity=2
size=0 capacity=1
empty
(empty)
size=0 capacity=1
```

```stdin
get 0
erase 0
insert -1 4
insert 0 4
insert 1 8
get -1
get 1
print
```

```expected hidden
bad index
bad index
bad index
bad index
8
4 8
```

```stdin
push 1
push 2
push 3
push 4
push 5
push 6
push 7
push 8
push 9
erase 0
erase 7
erase 3
stats
insert 3 -4
print
```

```expected hidden
size=6 capacity=16
2 3 4 -4 6 7 8
```

```checks
must new\s+int\s*\[ :: Allocate the array with new int[...].
must delete\s*\[\s*\] :: Free arrays with delete[].
must int\s*\*\s*&\s*\w+ :: Pass the data pointer by reference (int*& data) to the functions that reallocate.
mustnot std::vector|std::deque|std::list|std::copy :: Manage the heap array yourself.
```
:::

:::exercise Josephus circle {hard}
`n` people, numbered 1 to `n`, stand in a circle. Starting with person 1, they count off: the person who
says `k` leaves the circle, and counting starts again at 1 with the next person. This repeats until one
person is left. With `n = 7` and `k = 3`, people leave in the order 3, 6, 2, 7, 5, 1, and person 4
survives.

Simulate it with a **circular linked list** of heap nodes: each `Person` points to the next one, and the
last points back to the first. Remove a person by relinking the node before it and `delete` the removed
node. `k` can be huge, so don't walk around the circle more often than needed: with `r` people left,
moving `k - 1` steps is the same as moving `(k - 1) % r` steps.

**Input:** `n` (1 to 5000) and `k` (1 to 10^9).
**Output:** two lines: the people in the order they leave, separated by spaces (an empty line if
`n = 1`), then `survivor: <number>`.

```cpp starter
#include <iostream>

struct Person {
    int id;
    Person* next;
};

int main() {
}
```

```cpp solution
#include <iostream>

struct Person {
    int id;
    Person* next;
};

int main() {
    int n;
    long long k;
    std::cin >> n >> k;

    // Build the circle 1 -> 2 -> ... -> n -> back to 1.
    Person* first = new Person{1, nullptr};
    Person* last = first;
    for (int i = 2; i <= n; ++i) {
        last->next = new Person{i, nullptr};
        last = last->next;
    }
    last->next = first;

    Person* before = last;           // the person just before the one who says "1"
    int remaining = n;
    bool firstOut = true;
    while (remaining > 1) {
        long long steps = (k - 1) % remaining;
        for (long long s = 0; s < steps; ++s) {
            before = before->next;
        }
        Person* out = before->next;  // this person says k
        before->next = out->next;    // unlink...
        std::cout << (firstOut ? "" : " ") << out->id;
        firstOut = false;
        delete out;                  // ...and free
        --remaining;
    }
    std::cout << "\nsurvivor: " << before->id << '\n';
    delete before;                   // the last node left
}
```

```hint
To remove a node from a singly linked list you need the node **before** it. Keep a pointer `before` that
starts at the last person (the one before person 1). Then the person who says `k` is `k - 1` steps after
`before->next`.
```

```hint
Removing: `Person* out = before->next; before->next = out->next; delete out;`. Counting continues with
`before->next`, so `before` stays where it is.
```

```hint
With `r` people left, walking `r` steps brings you back to where you started, so walk only
`(k - 1) % r` steps. Without that, `k = 1000000000` would take forever.
```

```stdin
7 3
```

```expected
3 6 2 7 5 1
survivor: 4
```

```stdin
5 1
```

```expected
1 2 3 4
survivor: 5
```

```stdin
1 5
```

```expected hidden

survivor: 1
```

```stdin
2 2
```

```expected hidden
2
survivor: 1
```

```stdin
6 6
```

```expected hidden
6 1 3 2 5
survivor: 4
```

```stdin
10 1000000000
```

```expected hidden
10 1 9 7 4 3 2 5 8
survivor: 6
```

```stdin
41 3
```

```expected hidden
3 6 9 12 15 18 21 24 27 30 33 36 39 1 5 10 14 19 23 28 32 37 41 7 13 20 26 34 40 8 17 29 38 11 25 2 22 4 35 16
survivor: 31
```

```checks
must new\s+Person :: Allocate the people with new.
must delete\s+\w+ :: Delete every person who leaves.
mustnot std::vector|std::list|std::deque|std::queue|\w+\s*\[ :: Use the linked list of Person nodes, not an array.
```
:::

:::exercise Pair sums {hard}
Given a list of integers sorted in non-decreasing order, answer queries: for a target `t`, find two
elements at **different positions** whose sum is `t`. If there are several such pairs, report the one
whose smaller value is as small as possible. Print it as `x + y` with `x <= y`, or `none`.

Use the **two-pointer** technique: one pointer at the first element and one at the last. If their sum
is too small, move the left pointer right; if it's too big, move the right pointer left; stop when they
meet. That's one pass per query instead of trying every pair. Write

```cpp
bool findPair(const int* begin, const int* end, long long target, const int*& first, const int*& second);
```

which searches the half-open range `[begin, end)` and, on success, points `first` and `second` at the
two elements (they are references to pointers, so the caller sees the result).

**Input:** `n` (1 to 100000), `n` sorted integers (between -10^9 and 10^9), then `q` (1 to 100) and `q`
targets.
**Output:** one line per query.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <vector>

bool findPair(const int* begin, const int* end, long long target, const int*& first, const int*& second) {
    if (begin == end) {
        return false;
    }
    const int* lo = begin;
    const int* hi = end - 1;
    while (lo < hi) {
        long long sum = static_cast<long long>(*lo) + *hi;   // may exceed int
        if (sum == target) {
            first = lo;
            second = hi;
            return true;
        }
        if (sum < target) {
            ++lo;              // need a bigger sum
        } else {
            --hi;              // need a smaller sum
        }
    }
    return false;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) {
        std::cin >> v;
    }
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        long long target;
        std::cin >> target;
        const int* a = nullptr;
        const int* b = nullptr;
        if (findPair(values.data(), values.data() + n, target, a, b)) {
            std::cout << *a << " + " << *b << '\n';
        } else {
            std::cout << "none\n";
        }
    }
}
```

```hint
`values.data()` is a pointer to a vector's first element, so `values.data() + n` is its end. Inside
`findPair`, start with `lo = begin` and `hi = end - 1` and loop while `lo < hi` (two different
positions).
```

```hint
Add the two values as `long long`: `1000000000 + 1000000000` doesn't fit in an `int`.
```

```hint
Why is the first pair found the one with the smallest `x`? The pointers can never step past a valid
pair: moving `lo` right happens only when `*lo + *hi` is too small, and `hi` is never left of the best
pair's right element at that point. Convince yourself with `1 2 3 4 5 6` and target `7`.
```

```stdin
6
1 2 4 4 7 11
4
8 15 3 22
```

```expected
1 + 7
4 + 11
1 + 2
none
```

```stdin
1
5
2
10 5
```

```expected
none
none
```

```stdin
4
3 3 3 3
2
6 7
```

```expected hidden
3 + 3
none
```

```stdin
5
-10 -3 0 3 10
3
0 -13 7
```

```expected hidden
-10 + 10
-10 + -3
-3 + 10
```

```stdin
3
-1000000000 1000000000 1000000000
3
2000000000 0 -2000000000
```

```expected hidden
1000000000 + 1000000000
-1000000000 + 1000000000
none
```

```stdin
6
1 2 3 4 5 6
2
7 12
```

```expected hidden
1 + 6
none
```

```checks
must bool\s+findPair\s*\(\s*const\s+int\s*\*\s*\w+\s*,\s*const\s+int\s*\*\s*\w+\s*,\s*long\s+long\s+\w+\s*,\s*const\s+int\s*\*\s*&\s*\w+\s*,\s*const\s+int\s*\*\s*& :: Write bool findPair(const int* begin, const int* end, long long target, const int*& first, const int*& second).
```
:::
