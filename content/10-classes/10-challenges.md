---
title: "Classes & Objects: Challenges"
summary: Five hard, open-ended problems where you design the classes yourself, from a clock with a full operator set to a string that manages its own memory, plus two tricky predict-the-output quizzes.
---

These problems are meant to be **hard**. Each is a small real program: you get a precise
specification of the input and output, and you decide which classes to write, what goes in them, and
which operators they support. They combine everything from this module (encapsulation, constructors,
RAII, `const`, static members, operator overloading, copy and move semantics) with the earlier ones.

Try each one properly before opening a hint, and resist peeking at the solution: getting stuck on
an edge case and finding it yourself is the practice. The hidden tests are deliberately nasty.

## Quiz: who is built and destroyed when?

:::quiz
What does this program print?

```cpp
struct T {
    char c;
    T(char ch) : c(ch) { std::cout << c; }
    T(const T& o) : c(static_cast<char>(o.c + 1)) { std::cout << c; }
    ~T() { std::cout << '~' << c; }
};

struct Pair {
    T a{'a'};
    T b{'b'};
    Pair() { std::cout << 'P'; }
    ~Pair() { std::cout << "~P"; }
};

int main() {
    Pair p;
    T x = p.b;
}
```

- [x] `abPc~c~P~b~a`
- [ ] `abPc~P~b~a~c`
- [ ] `Pabc~c~P~a~b`
- [ ] `abPc~c~P~a~b`

Members are built in declaration order before the constructor body (`a`, `b`, then `P`). `T x = p.b;`
creates a **new** object, so it's the copy constructor, which prints `c`. At the end of `main`, locals
die in reverse order: `x` first (`~c`), then `p`: its destructor body (`~P`), then its members in
reverse declaration order (`~b`, `~a`).
:::

:::quiz
With guaranteed copy elision (C++17 and later), what does this print?

```cpp
struct S {
    S() { std::cout << 'D'; }
    S(const S&) { std::cout << 'C'; }
    S(S&&) noexcept { std::cout << 'M'; }
    S& operator=(const S&) { std::cout << 'c'; return *this; }
    S& operator=(S&&) noexcept { std::cout << 'm'; return *this; }
};

S make() { return S(); }

int main() {
    S a = make();
    S b = a;
    S c = std::move(a);
    b = make();
    c = b;
}
```

- [ ] `DMCMDmc`
- [x] `DCMDmc`
- [ ] `DCMDMc`
- [ ] `DCCDcc`

`make()` returns a prvalue, so `S a = make();` builds `a` directly: just `D`, no move. `S b = a;` copies
(`C`), `S c = std::move(a);` moves (`M`). `b = make();` assigns to an existing object: the temporary is
built (`D`) and then move-assigned (`m`). Finally `c = b;` copy-assigns (`c`).
:::

## Problems

:::exercise Clock arithmetic {hard}
Write a `Time` class for a 24-hour clock (minutes since midnight, always in `0..1439`) that behaves
like a built-in type:

- `operator>>` reads `HH:MM`, `operator<<` prints `HH:MM` (two digits each).
- `t += n` and `t -= n` move the clock by `n` minutes, wrapping around midnight in both directions.
  Non-members `t + n`, `n + t` and `t - n` return a new `Time`.
- Prefix and postfix `++` and `--` move by one minute, with the **usual** semantics: prefix returns the
  new value, postfix returns the old one.
- `a - b` (two `Time`s) is the number of minutes you wait from `b` until the clock next shows `a`
  (`0..1439`).
- All six comparisons (a defaulted `<=>` is fine).

**Input:** a start time, then commands until end of input. `t` is the current time.

| Command | Output |
| --- | --- |
| `add N` / `sub N` | do `t += N` / `t -= N` and print `t` |
| `peek N` | print `t + N` and `t - N` separated by a space, without changing `t` |
| `++t`, `t++`, `--t`, `t--` | evaluate that expression and print its value, then ` (now T)` with the current time |
| `until HH:MM` | print `M min`: the minutes from `t` until that time |
| `cmp HH:MM` | print `earlier`, `same` or `later`: how `t` compares to that time |

**Constraints:** `|N| <= 2147483647`, so `N` fits in an `int`, but `t + N` might not.

**Example:** starting at `23:58`, the commands `t++`, `++t`, `t--`, `add 125`, `until 01:00` print:

```
23:58 (now 23:59)
00:00 (now 00:00)
00:00 (now 23:59)
02:04
1376 min
```

```cpp starter
#include <iostream>
#include <string>

// design your Time class here

int main() {
    // read the start time, then the commands
}
```

```cpp solution
#include <compare>
#include <iomanip>
#include <iostream>
#include <string>

class Time {
    int minutes_ = 0;   // invariant: 0 <= minutes_ < 1440

    static int wrap(long long m) {
        long long r = m % 1440;
        if (r < 0) r += 1440;
        return static_cast<int>(r);
    }

public:
    Time() = default;
    Time(int h, int m) : minutes_(wrap(60LL * h + m)) {}

    Time& operator+=(long long n) {
        minutes_ = wrap(minutes_ + n);
        return *this;
    }
    Time& operator-=(long long n) { return *this += -n; }

    Time& operator++() { return *this += 1; }
    Time operator++(int) {
        Time old = *this;
        ++*this;
        return old;
    }
    Time& operator--() { return *this -= 1; }
    Time operator--(int) {
        Time old = *this;
        --*this;
        return old;
    }

    // minutes from b forward to a
    friend int operator-(const Time& a, const Time& b) { return wrap(a.minutes_ - b.minutes_); }

    auto operator<=>(const Time&) const = default;

    friend std::ostream& operator<<(std::ostream& os, const Time& t) {
        return os << std::setfill('0') << std::setw(2) << t.minutes_ / 60 << ':' << std::setw(2)
                  << t.minutes_ % 60;
    }
    friend std::istream& operator>>(std::istream& is, Time& t) {
        int h, m;
        char colon;
        if (is >> h >> colon >> m && colon == ':') t = Time(h, m);
        else is.setstate(std::ios::failbit);
        return is;
    }
};

Time operator+(Time t, long long n) { return t += n; }
Time operator+(long long n, Time t) { return t += n; }
Time operator-(Time t, long long n) { return t -= n; }

int main() {
    Time t;
    std::cin >> t;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "add" || cmd == "sub" || cmd == "peek") {
            long long n;
            std::cin >> n;
            if (cmd == "add") std::cout << (t += n) << '\n';
            else if (cmd == "sub") std::cout << (t -= n) << '\n';
            else std::cout << t + n << ' ' << t - n << '\n';
        } else if (cmd == "++t") {
            Time v = ++t;
            std::cout << v << " (now " << t << ")\n";
        } else if (cmd == "t++") {
            Time v = t++;
            std::cout << v << " (now " << t << ")\n";
        } else if (cmd == "--t") {
            Time v = --t;
            std::cout << v << " (now " << t << ")\n";
        } else if (cmd == "t--") {
            Time v = t--;
            std::cout << v << " (now " << t << ")\n";
        } else if (cmd == "until") {
            Time other;
            std::cin >> other;
            std::cout << other - t << " min\n";
        } else if (cmd == "cmp") {
            Time other;
            std::cin >> other;
            if (t < other) std::cout << "earlier\n";
            else if (t == other) std::cout << "same\n";
            else std::cout << "later\n";
        }
    }
}
```

```hint
Store one `int` of minutes and keep it in range in **one** private helper. In C++, `%` keeps the sign of
the left operand (`-5 % 1440 == -5`), so wrap with `r = m % 1440; if (r < 0) r += 1440;`, and do the
arithmetic in `long long`.
```

```hint
Postfix is `Time operator++(int)`: save a copy of `*this`, increment `*this` with the prefix version,
return the copy. `a - b` is just `wrap(a.minutes - b.minutes)`.
```

```stdin
23:58
t++
++t
t--
add 125
until 01:00
```

```expected
23:58 (now 23:59)
00:00 (now 00:00)
00:00 (now 23:59)
02:04
1376 min
```

```stdin
23:58
t++
++t
t--
--t
add 125
sub 1440
peek -61
until 01:00
until 23:59
cmp 02:03
cmp 00:00
cmp 23:00
```

```expected hidden
23:58 (now 23:59)
00:00 (now 00:00)
00:00 (now 23:59)
23:58 (now 23:58)
02:03
02:03
01:02 03:04
1377 min
1316 min
same
later
earlier
```

```stdin
00:00
--t
t++
sub 1000000
add -1
add 2147483647
peek 2880
until 00:00
until 15:26
sub -2147483647
```

```expected hidden
23:59 (now 23:59)
23:59 (now 00:00)
13:20
13:19
15:26
15:26 15:26
514 min
0 min
17:33
```

```stdin
12:00
t--
t--
--t
++t
t++
cmp 12:00
cmp 11:59
```

```expected hidden
12:00 (now 11:59)
11:59 (now 11:58)
11:57 (now 11:57)
11:58 (now 11:58)
11:58 (now 11:59)
earlier
same
```

```checks
must operator\s*\+\+\s*\(\s*int\s*\) :: Overload postfix ++ (it takes a dummy int parameter).
must operator\s*--\s*\(\s*\) :: Overload prefix --.
must operator\s*<<\s*\( :: Print Time with an overloaded operator<<.
must operator\s*>>\s*\( :: Read Time with an overloaded operator>>.
must operator\s*\+=\s*\( :: Write operator+=.
```
:::

:::exercise Big integers {hard}
`long long` tops out around 9.2 × 10¹⁸. Write a `BigInt` class for **signed integers of any size**,
stored as a sign plus a `std::vector` of digits, with:

- `operator>>` and `operator<<`,
- non-member `+`, `-` and `*`, and unary `-`,
- `==` and `<=>` (so `<` works).

Results are printed without leading zeros, and zero is always `0`, never `-0`.

**Input:** lines until end of input, each `A op B` where `op` is one of `+ - * < ==`. `A` and `B` are
integers with up to 200 digits, possibly with a leading `-`, without leading zeros (and never `-0`).
**Output:** one line per input line: the result, or `true`/`false` for `<` and `==`.

**Example:**

```
123 + 877              ->  1000
99999999999999999999 + 1  ->  100000000000000000000
-5 * 7                 ->  -35
12 < -13               ->  false
```

```cpp starter
#include <iostream>
#include <string>
#include <vector>

// design your BigInt class here

int main() {
    // read "A op B" lines until end of input
}
```

```cpp solution
#include <compare>
#include <iostream>
#include <string>
#include <vector>

class BigInt {
    bool negative_ = false;
    std::vector<int> digits_{0};   // least significant first; no leading zeros; zero is {0}, never negative

    void trim() {
        while (digits_.size() > 1 && digits_.back() == 0) digits_.pop_back();
        if (digits_.size() == 1 && digits_[0] == 0) negative_ = false;
    }

    // compare magnitudes only
    static int cmpAbs(const BigInt& a, const BigInt& b) {
        if (a.digits_.size() != b.digits_.size()) return a.digits_.size() < b.digits_.size() ? -1 : 1;
        for (std::size_t i = a.digits_.size(); i-- > 0;)
            if (a.digits_[i] != b.digits_[i]) return a.digits_[i] < b.digits_[i] ? -1 : 1;
        return 0;
    }
    static std::vector<int> addAbs(const std::vector<int>& a, const std::vector<int>& b) {
        std::vector<int> r;
        int carry = 0;
        for (std::size_t i = 0; i < a.size() || i < b.size() || carry; ++i) {
            int s = carry + (i < a.size() ? a[i] : 0) + (i < b.size() ? b[i] : 0);
            r.push_back(s % 10);
            carry = s / 10;
        }
        return r;
    }
    // requires |a| >= |b|
    static std::vector<int> subAbs(const std::vector<int>& a, const std::vector<int>& b) {
        std::vector<int> r;
        int borrow = 0;
        for (std::size_t i = 0; i < a.size(); ++i) {
            int s = a[i] - borrow - (i < b.size() ? b[i] : 0);
            borrow = s < 0;
            r.push_back(s < 0 ? s + 10 : s);
        }
        return r;
    }

public:
    BigInt() = default;
    explicit BigInt(const std::string& s) {
        std::size_t start = 0;
        if (!s.empty() && s[0] == '-') {
            negative_ = true;
            start = 1;
        }
        digits_.clear();
        for (std::size_t i = s.size(); i-- > start;) digits_.push_back(s[i] - '0');
        if (digits_.empty()) digits_.push_back(0);
        trim();
    }

    BigInt operator-() const {
        BigInt r = *this;
        r.negative_ = !negative_;
        r.trim();
        return r;
    }

    friend BigInt operator+(const BigInt& a, const BigInt& b) {
        BigInt r;
        if (a.negative_ == b.negative_) {
            r.digits_ = addAbs(a.digits_, b.digits_);
            r.negative_ = a.negative_;
        } else if (cmpAbs(a, b) >= 0) {
            r.digits_ = subAbs(a.digits_, b.digits_);
            r.negative_ = a.negative_;
        } else {
            r.digits_ = subAbs(b.digits_, a.digits_);
            r.negative_ = b.negative_;
        }
        r.trim();
        return r;
    }
    friend BigInt operator-(const BigInt& a, const BigInt& b) { return a + (-b); }

    friend BigInt operator*(const BigInt& a, const BigInt& b) {
        std::vector<long long> acc(a.digits_.size() + b.digits_.size(), 0);
        for (std::size_t i = 0; i < a.digits_.size(); ++i)
            for (std::size_t j = 0; j < b.digits_.size(); ++j) acc[i + j] += a.digits_[i] * b.digits_[j];
        BigInt r;
        r.digits_.clear();
        long long carry = 0;
        for (long long v : acc) {
            v += carry;
            r.digits_.push_back(static_cast<int>(v % 10));
            carry = v / 10;
        }
        while (carry) {
            r.digits_.push_back(static_cast<int>(carry % 10));
            carry /= 10;
        }
        r.negative_ = a.negative_ != b.negative_;
        r.trim();
        return r;
    }

    friend bool operator==(const BigInt& a, const BigInt& b) = default;
    friend std::strong_ordering operator<=>(const BigInt& a, const BigInt& b) {
        if (a.negative_ != b.negative_) return a.negative_ ? std::strong_ordering::less : std::strong_ordering::greater;
        int c = cmpAbs(a, b);
        if (a.negative_) c = -c;
        return c <=> 0;
    }

    friend std::ostream& operator<<(std::ostream& os, const BigInt& x) {
        if (x.negative_) os << '-';
        for (std::size_t i = x.digits_.size(); i-- > 0;) os << x.digits_[i];
        return os;
    }
    friend std::istream& operator>>(std::istream& is, BigInt& x) {
        std::string s;
        if (is >> s) x = BigInt(s);
        return is;
    }
};

int main() {
    BigInt a, b;
    std::string op;
    while (std::cin >> a >> op >> b) {
        if (op == "+") std::cout << a + b << '\n';
        else if (op == "-") std::cout << a - b << '\n';
        else if (op == "*") std::cout << a * b << '\n';
        else if (op == "<") std::cout << (a < b ? "true" : "false") << '\n';
        else if (op == "==") std::cout << (a == b ? "true" : "false") << '\n';
    }
}
```

```hint
Store the digits **least significant first** (`123` is `{3, 2, 1}`): schoolbook addition and
multiplication then walk the vector from index 0 with a carry. Write helpers that work on
**magnitudes** only (`addAbs`, `subAbs` that assumes `|a| >= |b|`, `cmpAbs`), then let the signed
operators pick the right helper and sign.
```

```hint
After every operation, strip leading zeros (from the back of the vector) and, if the value is zero,
force the sign to positive. That single `trim()` function prevents both `00` and `-0`. Then `a - b` can
simply be `a + (-b)`.
```

```stdin
123 + 877
99999999999999999999 + 1
-5 * 7
12 < -13
```

```expected
1000
100000000000000000000
-35
false
```

```stdin
5 - 5
0 * -7
-3 + 3
-12 - -12
-2 < -10
-10 < -2
100 == 100
-100 == 100
0 == 0
7 - 10
-7 - -10
```

```expected hidden
0
0
0
0
false
true
true
false
true
-3
3
```

```stdin
1 - 1000000000000000000000
-999999999999999999999999 * 999999999999999999999999
123456789012345678901234567890 * -987654321098765432109876543210
-1000000000000000000000 + 999999999999999999999
31415926535897932384626433832795 < 31415926535897932384626433832796
-31415926535897932384626433832795 < -31415926535897932384626433832796
```

```expected hidden
-999999999999999999999
-999999999999999999999998000000000000000000000001
-121932631137021795226185032733622923332237463801111263526900
-1
true
false
```

```checks
must operator\s*\*\s*\( :: Overload operator* for BigInt.
must operator\s*<<\s*\( :: Print BigInt with an overloaded operator<<.
must std::vector :: Store the digits in a std::vector.
```
:::

:::exercise Matrix calculator {hard}
Write a `Matrix` class (any number of rows and columns, `long long` entries) and a little calculator
that drives it. Give the class real operators: `+`, `-` (same shape), `*` between two matrices
(`A.cols == B.rows`), `*` with an integer scalar, `==` (equal only if the shapes **and** all entries
match), element access with `m(r, c)` (`operator()`, const and non-const), and `<<`.

**Input:** commands until end of input. Names are words made of letters.

| Command | Meaning |
| --- | --- |
| `let X R C v1 ... vRC` | define (or redefine) `X` as an `R`×`C` matrix, entries given row by row |
| `X = A + B`, `X = A - B` | sum / difference |
| `X = A * B` | matrix product |
| `X = A * k` | multiply every entry by the integer `k` (a token starting with a digit or `-` is a number) |
| `X = A ^ k` | `A` multiplied by itself `k` times (`k >= 0`; `A ^ 0` is the identity); `A` must be square |
| `print X` | print `RxC`, then each row with entries separated by spaces |
| `eq A B` | print `equal` or `not equal` |

**Errors** (the target is left unchanged): if an operand doesn't exist, print `error: unknown NAME`
(check the left operand first); if the shapes don't fit the operation, print `error: dimension mismatch`.
The target of an assignment may also be one of its operands (`A = A * A`).

**Constraints:** at most 10 rows and columns; all results fit in `long long`.

**Example:** after `let A 2 3 1 2 3 4 5 6` and `let B 3 2 7 8 9 10 11 12`, the commands
`C = A * B`, `print C`, `E = A + B` print:

```
2x2
58 64
139 154
error: dimension mismatch
```

```cpp starter
#include <iostream>
#include <map>
#include <string>
#include <vector>

// design your Matrix class here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <cctype>
#include <cstddef>
#include <iostream>
#include <map>
#include <string>
#include <vector>

class Matrix {
    std::size_t rows_ = 0, cols_ = 0;
    std::vector<long long> cells_;   // row-major

public:
    Matrix() = default;
    Matrix(std::size_t rows, std::size_t cols) : rows_(rows), cols_(cols), cells_(rows * cols, 0) {}

    static Matrix identity(std::size_t n) {
        Matrix m(n, n);
        for (std::size_t i = 0; i < n; ++i) m(i, i) = 1;
        return m;
    }

    std::size_t rows() const { return rows_; }
    std::size_t cols() const { return cols_; }
    bool sameShape(const Matrix& o) const { return rows_ == o.rows_ && cols_ == o.cols_; }

    long long& operator()(std::size_t r, std::size_t c) { return cells_[r * cols_ + c]; }
    const long long& operator()(std::size_t r, std::size_t c) const { return cells_[r * cols_ + c]; }

    Matrix& operator+=(const Matrix& o) {          // caller checks the shapes
        for (std::size_t i = 0; i < cells_.size(); ++i) cells_[i] += o.cells_[i];
        return *this;
    }
    Matrix& operator-=(const Matrix& o) {
        for (std::size_t i = 0; i < cells_.size(); ++i) cells_[i] -= o.cells_[i];
        return *this;
    }
    Matrix& operator*=(long long k) {
        for (long long& v : cells_) v *= k;
        return *this;
    }

    bool operator==(const Matrix&) const = default;

    friend std::ostream& operator<<(std::ostream& os, const Matrix& m) {
        for (std::size_t r = 0; r < m.rows_; ++r) {
            for (std::size_t c = 0; c < m.cols_; ++c) os << (c ? " " : "") << m(r, c);
            os << '\n';
        }
        return os;
    }
};

Matrix operator+(Matrix a, const Matrix& b) { return a += b; }
Matrix operator-(Matrix a, const Matrix& b) { return a -= b; }
Matrix operator*(Matrix a, long long k) { return a *= k; }
Matrix operator*(const Matrix& a, const Matrix& b) {   // caller checks a.cols() == b.rows()
    Matrix r(a.rows(), b.cols());
    for (std::size_t i = 0; i < a.rows(); ++i)
        for (std::size_t k = 0; k < a.cols(); ++k)
            for (std::size_t j = 0; j < b.cols(); ++j) r(i, j) += a(i, k) * b(k, j);
    return r;
}

int main() {
    std::map<std::string, Matrix> vars;
    std::string first;
    while (std::cin >> first) {
        if (first == "let") {
            std::string name;
            std::size_t r, c;
            std::cin >> name >> r >> c;
            Matrix m(r, c);
            for (std::size_t i = 0; i < r; ++i)
                for (std::size_t j = 0; j < c; ++j) std::cin >> m(i, j);
            vars[name] = m;
        } else if (first == "print") {
            std::string name;
            std::cin >> name;
            auto it = vars.find(name);
            if (it == vars.end()) std::cout << "error: unknown " << name << '\n';
            else std::cout << it->second.rows() << 'x' << it->second.cols() << '\n' << it->second;
        } else if (first == "eq") {
            std::string x, y;
            std::cin >> x >> y;
            if (!vars.count(x)) std::cout << "error: unknown " << x << '\n';
            else if (!vars.count(y)) std::cout << "error: unknown " << y << '\n';
            else std::cout << (vars[x] == vars[y] ? "equal" : "not equal") << '\n';
        } else {   // first is the target name:  X = A op B
            std::string eq, a, op, b;
            std::cin >> eq >> a >> op >> b;
            if (!vars.count(a)) {
                std::cout << "error: unknown " << a << '\n';
                continue;
            }
            const Matrix& ma = vars[a];
            bool scalar = std::isdigit(static_cast<unsigned char>(b[0])) || b[0] == '-';
            if (op == "^") {
                long long k = std::stoll(b);
                if (ma.rows() != ma.cols()) {
                    std::cout << "error: dimension mismatch\n";
                    continue;
                }
                Matrix result = Matrix::identity(ma.rows());
                for (long long i = 0; i < k; ++i) result = result * ma;
                vars[first] = result;
                continue;
            }
            if (op == "*" && scalar) {
                vars[first] = ma * std::stoll(b);
                continue;
            }
            if (!vars.count(b)) {
                std::cout << "error: unknown " << b << '\n';
                continue;
            }
            const Matrix& mb = vars[b];
            if (op == "*") {
                if (ma.cols() != mb.rows()) std::cout << "error: dimension mismatch\n";
                else vars[first] = ma * mb;
            } else {
                if (!ma.sameShape(mb)) std::cout << "error: dimension mismatch\n";
                else vars[first] = op == "+" ? ma + mb : ma - mb;
            }
        }
    }
}
```

```hint
Store the entries in one `std::vector<long long>` of size `rows * cols`, row-major: entry `(r, c)`
lives at index `r * cols + c`. Then a defaulted `operator==` compares rows, columns and entries in one
line, and copying the class is free (rule of zero).
```

```hint
Keep the shape checks in `main` (where the error messages are printed) and let the operators assume
valid shapes. For `^`, start from an identity matrix and multiply `k` times. A `std::map<std::string, Matrix>`
holds the variables.
```

```stdin
let A 2 3 1 2 3 4 5 6
let B 3 2 7 8 9 10 11 12
C = A * B
print C
E = A + B
```

```expected
2x2
58 64
139 154
error: dimension mismatch
```

```stdin
let A 2 3 1 2 3 4 5 6
let B 3 2 7 8 9 10 11 12
D = B * A
print D
F = A * -2
print F
C = A * B
G = C ^ 2
print G
H = C ^ 0
print H
X = Q + A
X = A + Q
print X
Y = A ^ 2
print Y
```

```expected hidden
3x3
39 54 69
49 68 87
59 82 105
2x3
-2 -4 -6
-8 -10 -12
2x2
12260 13568
29468 32612
2x2
1 0
0 1
error: unknown Q
error: unknown Q
error: unknown X
error: dimension mismatch
error: unknown Y
```

```stdin
let P 1 4 1 2 3 4
let Q 2 2 1 2 3 4
eq P Q
let R 2 2 1 2 3 4
eq Q R
R = R * R
print R
R = R - Q
print R
Z = Q * 0
print Z
eq Z Z
Q = Q * Q
eq Q R
let Q 1 1 -3
W = Q ^ 3
print W
```

```expected hidden
not equal
equal
2x2
7 10
15 22
2x2
6 8
12 18
2x2
0 0
0 0
equal
not equal
1x1
-27
```

```checks
must operator\s*\(\s*\)\s*\( :: Give Matrix element access with operator()(r, c).
must operator\s*==|operator\s*<=> :: Compare matrices with an overloaded operator==.
must operator\s*\*\s*\( :: Overload operator* for matrices.
```
:::

:::exercise A string of your own {hard}
Write `MyString`, a string class that manages its own heap buffer with `new char[]` and `delete[]`
(no `std::string` or `std::vector` **inside** the class). It must follow the **rule of five**:
destructor, deep copy constructor, copy assignment, `noexcept` move constructor and move assignment.
An empty string owns no buffer, and a moved-from string is **empty**.

Also give it `operator+=` (append), a non-member `operator+`, `operator==`, `operator<<`, `size()` and a
`reverse()` member.

**Input:** commands until end of input, working on 26 variables `a` to `z` (all empty at the start).
Words contain no spaces.

| Command | Meaning |
| --- | --- |
| `set X WORD` | `X = MyString(WORD)` |
| `clear X` | `X = MyString()` |
| `copy X Y` | `Y = X;` |
| `move X Y` | `Y = std::move(X);` |
| `append X Y` | `X += Y;` |
| `concat X Y Z` | `Z = X + Y;` |
| `rev X` | reverse `X` in place |
| `print X` | print `X = "TEXT" (LENGTH)` |
| `eq X Y` | print `equal` or `different` |

`X` and `Y` may be the **same** variable in any command: `copy a a` and `move a a` leave `a` unchanged,
and `append a a` doubles `a`.

**Example:** `set a hi`, `copy a b`, `append b a`, `move b c`, `print b`, `print c` prints:

```
b = "" (0)
c = "hihi" (4)
```

```cpp starter
#include <iostream>
#include <string>

// design your MyString class here (no std::string inside it)

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <cstddef>
#include <cstring>
#include <iostream>
#include <string>
#include <utility>

class MyString {
    char* data_ = nullptr;     // nullptr when empty; otherwise size_ chars (no terminator needed)
    std::size_t size_ = 0;

public:
    MyString() = default;
    explicit MyString(const char* s) : size_(std::strlen(s)) {
        if (size_) {
            data_ = new char[size_];
            std::memcpy(data_, s, size_);
        }
    }
    ~MyString() { delete[] data_; }

    MyString(const MyString& o) : data_(o.size_ ? new char[o.size_] : nullptr), size_(o.size_) {
        if (size_) std::memcpy(data_, o.data_, size_);
    }
    MyString(MyString&& o) noexcept
        : data_(std::exchange(o.data_, nullptr)), size_(std::exchange(o.size_, 0)) {}

    MyString& operator=(const MyString& o) {
        if (this != &o) {
            MyString copy(o);
            swap(*this, copy);
        }
        return *this;
    }
    MyString& operator=(MyString&& o) noexcept {
        if (this != &o) {
            delete[] data_;
            data_ = std::exchange(o.data_, nullptr);
            size_ = std::exchange(o.size_, 0);
        }
        return *this;
    }

    friend void swap(MyString& a, MyString& b) noexcept {
        std::swap(a.data_, b.data_);
        std::swap(a.size_, b.size_);
    }

    MyString& operator+=(const MyString& o) {
        if (o.size_ == 0) return *this;
        std::size_t n = size_ + o.size_;
        char* fresh = new char[n];
        if (size_) std::memcpy(fresh, data_, size_);
        std::memcpy(fresh + size_, o.data_, o.size_);   // o may be *this: data_ is still alive here
        delete[] data_;
        data_ = fresh;
        size_ = n;
        return *this;
    }

    void reverse() {
        for (std::size_t i = 0, j = size_; i + 1 < j; ++i, --j) std::swap(data_[i], data_[j - 1]);
    }

    std::size_t size() const { return size_; }
    char& operator[](std::size_t i) { return data_[i]; }
    const char& operator[](std::size_t i) const { return data_[i]; }

    friend bool operator==(const MyString& a, const MyString& b) {
        return a.size_ == b.size_ && (a.size_ == 0 || std::memcmp(a.data_, b.data_, a.size_) == 0);
    }
    friend std::ostream& operator<<(std::ostream& os, const MyString& s) {
        for (std::size_t i = 0; i < s.size_; ++i) os << s.data_[i];
        return os;
    }
};

MyString operator+(MyString a, const MyString& b) { return a += b; }

int main() {
    MyString vars[26];
    std::string cmd;
    while (std::cin >> cmd) {
        char x, y, z;
        if (cmd == "set") {
            std::string word;
            std::cin >> x >> word;
            vars[x - 'a'] = MyString(word.c_str());
        } else if (cmd == "clear") {
            std::cin >> x;
            vars[x - 'a'] = MyString();
        } else if (cmd == "copy") {
            std::cin >> x >> y;
            vars[y - 'a'] = vars[x - 'a'];
        } else if (cmd == "move") {
            std::cin >> x >> y;
            vars[y - 'a'] = std::move(vars[x - 'a']);
        } else if (cmd == "append") {
            std::cin >> x >> y;
            vars[x - 'a'] += vars[y - 'a'];
        } else if (cmd == "concat") {
            std::cin >> x >> y >> z;
            vars[z - 'a'] = vars[x - 'a'] + vars[y - 'a'];
        } else if (cmd == "rev") {
            std::cin >> x;
            vars[x - 'a'].reverse();
        } else if (cmd == "upper") {
            std::cin >> x;
            MyString& s = vars[x - 'a'];
            for (std::size_t i = 0; i < s.size(); ++i)
                if (s[i] >= 'a' && s[i] <= 'z') s[i] = static_cast<char>(s[i] - 'a' + 'A');
        } else if (cmd == "print") {
            std::cin >> x;
            std::cout << x << " = \"" << vars[x - 'a'] << "\" (" << vars[x - 'a'].size() << ")\n";
        } else if (cmd == "eq") {
            std::cin >> x >> y;
            std::cout << (vars[x - 'a'] == vars[y - 'a'] ? "equal" : "different") << '\n';
        }
    }
}
```

```hint
`append a a` is the classic trap: if `+=` frees the old buffer *before* copying from `other`, and
`other` is `*this`, it copies from freed memory. Allocate the new buffer, copy **both** parts into it,
and only then `delete[]` the old one.
```

```hint
Self-assignment: guard both assignment operators with `if (this != &other)`. In the move operations,
steal the pointer and size with `std::exchange(other.data_, nullptr)` and `std::exchange(other.size_, 0)`,
so the source is left empty and its destructor frees nothing.
```

```stdin
set a hi
copy a b
append b a
move b c
print b
print c
```

```expected
b = "" (0)
c = "hihi" (4)
```

```stdin
set a hello
copy a b
append b a
print a
print b
move b c
print b
print c
move c c
print c
copy c c
print c
concat a a d
print d
rev d
print d
eq c d
rev d
eq c d
```

```expected hidden
a = "hello" (5)
b = "hellohello" (10)
b = "" (0)
c = "hellohello" (10)
c = "hellohello" (10)
c = "hellohello" (10)
d = "hellohello" (10)
d = "olleholleh" (10)
different
equal
```

```stdin
print q
append q q
print q
eq q z
set x racecar
rev x
print x
set y ab
append y y
append y y
print y
concat y q y
print y
concat q y q
print q
move q r
move q r
print r
print q
clear r
print r
set s x
rev s
print s
```

```expected hidden
q = "" (0)
q = "" (0)
equal
x = "racecar" (7)
y = "abababab" (8)
y = "abababab" (8)
q = "abababab" (8)
r = "" (0)
q = "" (0)
r = "" (0)
s = "x" (1)
```

```checks
must new\s+char\s*\[ :: Allocate the characters yourself with new char[].
must delete\s*\[\s*\] :: Free the buffer with delete[].
must MyString\s*\(\s*MyString\s*&&\s*\w*\s*\)\s*noexcept :: Write a noexcept move constructor.
must MyString\s*\(\s*const\s+MyString\s*& :: Write a deep-copying copy constructor.
must operator\s*\+=\s*\( :: Overload operator+= for appending.
```
:::

:::exercise Lending library {hard}
Model a small lending library with (at least) three classes: `Book` (gets a unique id from a **static**
counter, starting at 1, and tracks total and available copies), `Member` (a name and the books they
hold, at most **3**), and `Library`, which owns them and enforces the rules. Give `Book` an
`operator<<` for the report.

**Input:** commands until end of input. Titles and names are single words.

| Command | Success output |
| --- | --- |
| `book TITLE N` | `added #ID TITLE (N)`: a new title with `N` copies |
| `join NAME` | `welcome NAME` |
| `borrow NAME ID` | `NAME borrowed TITLE` |
| `return NAME ID` | `NAME returned TITLE` |
| `report` | each book in id order as `#ID TITLE AVAILABLE/TOTAL`, then each member in **alphabetical** order as `NAME:` followed by ` TITLE` for each book they hold (in the order they borrowed them), or ` -` if none |

**Errors** are checked in this order, and the first that applies is printed:

- `join`: `error: NAME is already a member`
- `borrow`: `error: no member NAME`, `error: no book #ID`, `error: NAME already has TITLE`,
  `error: NAME has 3 books`, `error: TITLE is out`
- `return`: `error: no member NAME`, `error: no book #ID`, `error: NAME doesn't have TITLE`

**Example:** `book Dune 1`, `join ann`, `join bob`, `borrow ann 1`, `borrow bob 1`, `borrow cy 1`,
`report` prints:

```
added #1 Dune (1)
welcome ann
welcome bob
ann borrowed Dune
error: Dune is out
error: no member cy
#1 Dune 0/1
ann: Dune
bob: -
```

```cpp starter
#include <iostream>
#include <map>
#include <string>
#include <vector>

// design your Book, Member and Library classes here

int main() {
    // read commands until end of input
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <utility>
#include <vector>

class Book {
    inline static int nextId_ = 1;
    int id_;
    std::string title_;
    int total_;
    int available_;

public:
    Book(std::string title, int copies)
        : id_(nextId_++), title_(std::move(title)), total_(copies), available_(copies) {}

    int id() const { return id_; }
    const std::string& title() const { return title_; }
    bool available() const { return available_ > 0; }
    void lend() { --available_; }
    void giveBack() { ++available_; }

    friend std::ostream& operator<<(std::ostream& os, const Book& b) {
        return os << '#' << b.id_ << ' ' << b.title_ << ' ' << b.available_ << '/' << b.total_;
    }
};

class Member {
    std::string name_;
    std::vector<int> borrowed_;   // book ids, in borrowing order

public:
    static constexpr int limit = 3;
    explicit Member(std::string name) : name_(std::move(name)) {}

    const std::string& name() const { return name_; }
    bool has(int id) const { return std::find(borrowed_.begin(), borrowed_.end(), id) != borrowed_.end(); }
    bool full() const { return static_cast<int>(borrowed_.size()) >= limit; }
    void take(int id) { borrowed_.push_back(id); }
    void giveBack(int id) { borrowed_.erase(std::find(borrowed_.begin(), borrowed_.end(), id)); }
    const std::vector<int>& borrowed() const { return borrowed_; }
};

class Library {
    std::vector<Book> books_;                 // book with id i is books_[i - 1]
    std::map<std::string, Member> members_;   // sorted by name

    Book* findBook(int id) {
        if (id < 1 || id > static_cast<int>(books_.size())) return nullptr;
        return &books_[id - 1];
    }
    Member* findMember(const std::string& name) {
        auto it = members_.find(name);
        return it == members_.end() ? nullptr : &it->second;
    }

public:
    void addBook(const std::string& title, int copies) {
        books_.emplace_back(title, copies);
        std::cout << "added #" << books_.back().id() << ' ' << title << " (" << copies << ")\n";
    }

    void join(const std::string& name) {
        if (findMember(name)) std::cout << "error: " << name << " is already a member\n";
        else {
            members_.emplace(name, Member(name));
            std::cout << "welcome " << name << '\n';
        }
    }

    void borrow(const std::string& name, int id) {
        Member* m = findMember(name);
        Book* b = findBook(id);
        if (!m) std::cout << "error: no member " << name << '\n';
        else if (!b) std::cout << "error: no book #" << id << '\n';
        else if (m->has(id)) std::cout << "error: " << name << " already has " << b->title() << '\n';
        else if (m->full()) std::cout << "error: " << name << " has " << Member::limit << " books\n";
        else if (!b->available()) std::cout << "error: " << b->title() << " is out\n";
        else {
            b->lend();
            m->take(id);
            std::cout << name << " borrowed " << b->title() << '\n';
        }
    }

    void giveBack(const std::string& name, int id) {
        Member* m = findMember(name);
        Book* b = findBook(id);
        if (!m) std::cout << "error: no member " << name << '\n';
        else if (!b) std::cout << "error: no book #" << id << '\n';
        else if (!m->has(id)) std::cout << "error: " << name << " doesn't have " << b->title() << '\n';
        else {
            b->giveBack();
            m->giveBack(id);
            std::cout << name << " returned " << b->title() << '\n';
        }
    }

    void report() const {
        for (const Book& b : books_) std::cout << b << '\n';
        for (const auto& [name, m] : members_) {
            std::cout << name << ':';
            if (m.borrowed().empty()) std::cout << " -";
            for (int id : m.borrowed()) std::cout << ' ' << books_[id - 1].title();
            std::cout << '\n';
        }
    }
};

int main() {
    Library lib;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "book") {
            std::string title;
            int n;
            std::cin >> title >> n;
            lib.addBook(title, n);
        } else if (cmd == "join") {
            std::string name;
            std::cin >> name;
            lib.join(name);
        } else if (cmd == "borrow" || cmd == "return") {
            std::string name;
            int id;
            std::cin >> name >> id;
            if (cmd == "borrow") lib.borrow(name, id);
            else lib.giveBack(name, id);
        } else if (cmd == "report") {
            lib.report();
        }
    }
}
```

```hint
Ids start at 1 and never repeat, so `books_[id - 1]` in a `std::vector<Book>` finds a book in constant
time. A `std::map<std::string, Member>` keeps members sorted by name for the report.
```

```hint
Write small private lookup helpers that return a pointer or `nullptr` (`Book* findBook(int id)`,
`Member* findMember(const std::string&)`), then each command is a chain of `if / else if` checks in
exactly the order the spec lists.
```

```stdin
book Dune 1
join ann
join bob
borrow ann 1
borrow bob 1
borrow cy 1
report
```

```expected
added #1 Dune (1)
welcome ann
welcome bob
ann borrowed Dune
error: Dune is out
error: no member cy
#1 Dune 0/1
ann: Dune
bob: -
```

```stdin
book Dune 2
book Emma 1
join bob
join ann
borrow ann 1
borrow bob 1
borrow cy 1
borrow ann 1
borrow ann 2
borrow bob 1
borrow bob 3
borrow bob 0
report
return bob 2
return ann 1
return cy 1
return ann 9
borrow bob 2
join bob
report
```

```expected hidden
added #1 Dune (2)
added #2 Emma (1)
welcome bob
welcome ann
ann borrowed Dune
bob borrowed Dune
error: no member cy
error: ann already has Dune
ann borrowed Emma
error: bob already has Dune
error: no book #3
error: no book #0
#1 Dune 0/2
#2 Emma 0/1
ann: Dune Emma
bob: Dune
error: bob doesn't have Emma
ann returned Dune
error: no member cy
error: no book #9
error: Emma is out
error: bob is already a member
#1 Dune 1/2
#2 Emma 0/1
ann: Emma
bob: Dune
```

```stdin
report
book A 5
book B 5
book C 5
book D 1
join zoe
join amy
borrow zoe 1
borrow zoe 2
borrow zoe 3
borrow zoe 4
borrow amy 4
return zoe 2
borrow zoe 4
borrow zoe 2
borrow amy 4
return zoe 4
borrow amy 4
report
```

```expected hidden
added #1 A (5)
added #2 B (5)
added #3 C (5)
added #4 D (1)
welcome zoe
welcome amy
zoe borrowed A
zoe borrowed B
zoe borrowed C
error: zoe has 3 books
amy borrowed D
zoe returned B
error: D is out
zoe borrowed B
error: amy already has D
error: zoe doesn't have D
error: amy already has D
#1 A 4/5
#2 B 4/5
#3 C 4/5
#4 D 0/1
amy: D
zoe: A C B
```

```checks
must \bstatic\b :: Hand out book ids from a static counter.
must operator\s*<<\s*\( :: Give Book an operator<< for the report.
must class\s+Library\b :: Write a Library class that owns the books and members.
```
:::
