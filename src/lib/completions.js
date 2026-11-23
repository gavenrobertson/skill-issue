// Autocompletion for the editor: C++ keywords, common standard library names, and a few snippets.
import { completeFromList, snippetCompletion, completeAnyWord } from '@codemirror/autocomplete';
import { cppLanguage } from '@codemirror/lang-cpp';

const KEYWORDS = `alignas alignof auto bool break case catch char char8_t char16_t char32_t class concept const consteval constexpr constinit
const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false
float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register
reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local
throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while override final`.split(/\s+/);

const STD = `cout cin cerr clog endl getline string string_view vector array map unordered_map set unordered_set multimap multiset
deque list forward_list stack queue priority_queue pair tuple make_pair make_tuple tie optional nullopt variant visit get holds_alternative
unique_ptr shared_ptr weak_ptr make_unique make_shared move forward swap sort stable_sort find find_if count count_if accumulate reduce
transform for_each copy copy_if remove remove_if erase erase_if reverse unique min max min_element max_element minmax_element clamp
lower_bound upper_bound binary_search equal_range iota fill all_of any_of none_of partial_sum next prev distance advance begin end size ssize
to_string stoi stol stoll stod stof format setw setprecision fixed setfill left right boolalpha hex dec oct numeric_limits size_t int64_t
uint64_t int32_t uint32_t function invoke ranges views istringstream ostringstream stringstream ifstream ofstream fstream runtime_error
logic_error invalid_argument out_of_range exception thread mutex lock_guard scoped_lock unique_lock atomic async future chrono span`.split(/\s+/);

const SNIPPETS = [
  snippetCompletion('#include <iostream>\n\nint main() {\n    ${}\n}', { label: 'main', detail: 'program skeleton', type: 'keyword' }),
  snippetCompletion('for (int ${i} = 0; ${i} < ${n}; ++${i}) {\n    ${}\n}', { label: 'fori', detail: 'counting for loop', type: 'keyword' }),
  snippetCompletion('for (const auto& ${x} : ${items}) {\n    ${}\n}', { label: 'forr', detail: 'range-based for', type: 'keyword' }),
  snippetCompletion('while (${condition}) {\n    ${}\n}', { label: 'while', detail: 'while loop', type: 'keyword' }),
  snippetCompletion('if (${condition}) {\n    ${}\n}', { label: 'if', detail: 'if block', type: 'keyword' }),
  snippetCompletion('class ${Name} {\npublic:\n    ${Name}() = default;\n\nprivate:\n    ${}\n};', { label: 'class', detail: 'class skeleton', type: 'keyword' }),
  snippetCompletion('struct ${Name} {\n    ${}\n};', { label: 'struct', detail: 'struct skeleton', type: 'keyword' }),
  snippetCompletion("std::cout << ${} << '\\n';", { label: 'cout', detail: 'print a line', type: 'function' }),
  snippetCompletion('#include <${iostream}>', { label: '#include', detail: 'include a header', type: 'keyword' }),
];

const list = [...SNIPPETS, ...KEYWORDS.map((label) => ({ label, type: 'keyword' })), ...STD.map((label) => ({ label, type: 'variable', detail: 'std' }))];

export const cppCompletions = [cppLanguage.data.of({ autocomplete: completeFromList(list) }), cppLanguage.data.of({ autocomplete: completeAnyWord })];
