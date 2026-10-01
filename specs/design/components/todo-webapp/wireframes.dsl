screen TodoList "The signed-in user's todo list — add a todo, edit a pending one, or mark one done"
  navbar "Todo"
  heading "My Todos"
  row
    input "What needs doing?"
    button "Add" primary // adds the todo and stays on this page
  table "Todo | Status | Action" -> EditTodo
    row "Buy milk | Pending | Edit"
    row "Write report | Done | —"

screen EditTodo "Edit a pending todo's text"
  navbar "Todo"
  heading "Edit Todo"
  input "Buy milk"
  row
    button "Cancel"
    right
    button "Save" primary -> TodoList

flow "Manage todos"
  role "User"
  description "A signed-in user adds a todo, edits one while it's pending, and marks one done"
  TodoList
  EditTodo
