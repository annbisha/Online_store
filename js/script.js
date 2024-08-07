(function () {
  const gql = (url, query, variables = {}) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer " +
          (store.getState().auth.token || localStorage.getItem("token") || ""),
      },
      body: JSON.stringify({ query, variables }),
    }).then((res) => res.json());

  const CategoryQuery = `query CategoryQuery($q: String) {
    CategoryFind(query: $q) {
      _id
      name
    }
  }`;
  const NewUser = `mutation newUser($login: String, $password: String) {
    UserUpsert(user: {login: $login, password: $password}) {
      _id
      login
    }
  }`;

  const UserLogin = `query login($login: String, $password: String) {
    login(login: $login, password: $password)
  }`;
  const CategoryOneQuery = `query CategoryOneQuery($q: String) {
    CategoryFindOne(query: $q) {
      goods {
        name
        price
        _id
        categories {
          name
        }
      }
    }
  }`;
  const GoodFindOne = `query GoodFindOne($q: String) {
    GoodFindOne(query: $q) {
      _id
      name
      description
      price
      images {
        url
      }
    }
  }`;
  const OrderUpsert = `mutation newOrder($goods: [OrderGoodInput]) {
    OrderUpsert(order: {orderGoods: $goods}) {
        _id
        orderGoods {
            _id
            count
            good{
                _id
                name
            }
            order{
                _id
            }
          }
        }
    }`;

  const OrderFind = `query orderFind {
      OrderFind(query: "[{}]") {
          _id
          total
          createdAt
          orderGoods {
              good {
                  _id
                  name
              }
              total
              price
              count
          }
          owner {
              login
          }
      }
  }`;
  let idUsername = document.getElementById("username");
  let idPassword = document.getElementById("password");
  let idButton = document.getElementById("button");
  idButton.addEventListener("click", function (event) {
    event.preventDefault();
    let username = idUsername.value;
    let password = idPassword.value;
    store.dispatch(actionRegisterUser(username, password));
  });

  const actionRegisterUser = (login, password) =>
    actionPromise(
      "register",
      gql("http://shop-roles.node.ed.asmer.org.ua/graphql", NewUser, {
        login,
        password,
      })
    );

  let idUsername1 = document.getElementById("username1");
  let idPassword1 = document.getElementById("password1");
  let idButton1 = document.getElementById("button1");
  idButton1.addEventListener("click", function (event) {
    event.preventDefault();
    let username_log = idUsername1.value;
    let password_log = idPassword1.value;
    store.dispatch(actionLoginUser(username_log, password_log));
  });

  const actionLoginUser = (login, password) =>
    actionPromise(
      "login",
      gql("http://shop-roles.node.ed.asmer.org.ua/graphql", UserLogin, {
        login,
        password,
      }).then((response) => {
        if (response.data && response.data.login) {
          store.dispatch(actionAuthLogin(response.data.login));
          localStorageResponce(response.data.login);
          greatingUser();
        }
        return response;
      })
    );

  function localStorageResponce(token) {
    localStorage.setItem("token", token);
    const str = token.split(".");
    let index = atob(str[1]);
    let decodeJson = JSON.parse(index);
    localStorage.setItem("login", decodeJson.sub.login);
    localStorage.setItem("id", decodeJson.sub.id);
  }

  function greatingUser() {
    let getLogin = localStorage.getItem("login");
    if (getLogin) {
      document.getElementById("text_login").textContent = "Hello " + getLogin;
    } else {
      document.getElementById("text_login").textContent = "Hello ";
    }
  }

  greatingUser();

  let logout = document.getElementById("button_head_logout");
  logout.addEventListener("click", function (event) {
    event.preventDefault();
    store.dispatch(actionAuthLogout());
    localStorage.clear();
    greatingUser();
    location.hash = "#/login";
  });

  function createStore(reducer) {
    let state = reducer(undefined, {});
    let cbs = [];

    const getState = () => state;
    const subscribe = (cb) => (
      cbs.push(cb), () => (cbs = cbs.filter((c) => c !== cb))
    );

    const dispatch = (action) => {
      if (typeof action === "function") {
        return action(dispatch, getState);
      }
      const newState = reducer(state, action);
      if (newState !== state) {
        state = newState;
        for (let cb of cbs) cb(state);
      }
    };

    return {
      getState,
      dispatch,
      subscribe,
    };
  }

  function combineReducers(reducers) {
    function totalReducer(state = {}, action) {
      const newTotalState = {};
      for (const [reducerName, reducer] of Object.entries(reducers)) {
        const newSubState = reducer(state[reducerName], action);
        if (newSubState !== state[reducerName]) {
          newTotalState[reducerName] = newSubState;
        }
      }
      if (Object.keys(newTotalState).length) {
        return { ...state, ...newTotalState };
      }
      return state;
    }

    return totalReducer;
  }

  function promiseReducer(state = {}, { type, status, payload, error, name }) {
    if (type === "PROMISE") {
      return { ...state, [name]: { status, payload, error } };
    }
    return state;
  }

  const actionPending = (name) => ({
    type: "PROMISE",
    status: "PENDING",
    name,
  });
  const actionFulfilled = (name, payload) => ({
    type: "PROMISE",
    status: "FULFILLED",
    payload,
    name,
  });
  const actionRejected = (name, error) => ({
    type: "PROMISE",
    status: "REJECTED",
    error,
    name,
  });

  const actionPromise = (name, promise) => async (dispatch) => {
    dispatch(actionPending(name));
    try {
      const payload = await promise;
      dispatch(actionFulfilled(name, payload));
      return payload;
    } catch (error) {
      dispatch(actionRejected(name, error));
    }
  };
  const actionCartAdd = (good, count = 1) => ({
    type: "CART_ADD",
    count,
    good,
  });
  const actionCartUpdateQuantity = (good, count) => ({
    type: "CART_UPDATE_QUANTITY",
    count,
    good,
  });

  const actionCartDel = (good) => ({ type: "CART_DEL", good });

  const actionCartClear = () => ({ type: "CART_CLEAR" });

  const cartReducer = (state = {}, action) => {
    const { type, count, good } = action;
    const newState = { ...state };

    switch (type) {
      case "CART_ADD":
        if (newState[good._id]) {
          newState[good._id].count += count;
        } else {
          newState[good._id] = { good, count };
        }
        return newState;

      case "CART_UPDATE_QUANTITY":
        if (count > 0) {
          newState[good._id] = { good, count };
        } else {
          delete newState[good._id];
        }
        return newState;

      case "CART_DEL":
        delete newState[good._id];
        return newState;

      case "CART_CLEAR":
        return {};

      default:
        return state;
    }
  };

  const actionGetCategories = () =>
    actionPromise(
      "categories",
      gql("http://shop-roles.node.ed.asmer.org.ua/graphql", CategoryQuery, {
        q: JSON.stringify([{ parent: null }]),
      })
    );

  const drawCategories = () => {
    const state = store.getState();
    const { status, payload, error } = state.promise.categories || {};
    const aside = document.getElementById("aside");

    if (status === "PENDING") {
      aside.innerHTML =
        "<img src='https://cdn.dribbble.com/users/63485/screenshots/1309731/infinite-gif-preloader.gif' />";
    }
    if (status === "FULFILLED" && payload && payload.data) {
      aside.innerHTML = "";
      for (const { _id, name } of payload.data.CategoryFind) {
        const link = document.createElement("a");
        link.href = `#/category/${_id}`;
        link.textContent = name;
        link.dataset.id = _id;
        link.addEventListener("click", function (event) {
          event.preventDefault();
          const links = document.querySelectorAll("#aside a");
          links.forEach((link) => link.classList.remove("active"));
          event.target.classList.add("active");
          store.dispatch(actionGetCategoryOne(_id));
          location.hash = `#/category/${_id}`;
          hideForms();
        });
        aside.appendChild(link);
      }
    }
    if (status === "REJECTED") {
      aside.innerHTML = `<div>Error: ${error}</div>`;
    }
  };

  const actionGoodFindOne = (_id) =>
    actionPromise(
      "good_one",
      gql("http://shop-roles.node.ed.asmer.org.ua/graphql", GoodFindOne, {
        q: JSON.stringify([{ _id }]),
      }).then((response) => {
        goodFindOneMore(response);
        location.hash = `#/good/${_id}`;
        hideForms();
      })
    );

  const actionGetCategoryOne = (_id) =>
    actionPromise(
      "category_one",
      gql("http://shop-roles.node.ed.asmer.org.ua/graphql", CategoryOneQuery, {
        q: JSON.stringify([{ _id }]),
      }).then((response) => {
        goodFindOneCard(response);
      })
    );
  const actionFullOrder = () => async (dispatch, getState) => {
    const state = getState();
    const cart = state.cart;
    const orderGoods = Object.values(cart).map((item) => ({
      good: { _id: item.good._id },
      count: item.count,
    }));
    try {
      const response = await gql(
        "http://shop-roles.node.ed.asmer.org.ua/graphql",
        OrderUpsert,
        {
          goods: orderGoods,
        }
      );
      dispatch(actionCartClear());
    } catch (error) {
      console.error("Order submission failed", error);
    }
  };
  function goodFindOneCard(response) {
    let array = response.data.CategoryFindOne.goods;
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = "";

    for (const obj of array) {
      const productDiv = document.createElement("div");
      productDiv.classList.add("product");

      const productName = document.createElement("h3");
      productName.textContent = `Name: ${obj.name}`;

      const buttonDescription = document.createElement("button");
      buttonDescription.textContent = "View Details";
      buttonDescription.addEventListener("click", function () {
        const links = document.querySelectorAll("#aside a");
        links.forEach((link) => link.classList.remove("active"));
        contentDiv.innerHTML = "";
        store.dispatch(actionGoodFindOne(obj._id));
      });

      const productPrice = document.createElement("p");
      productPrice.textContent = `Price: ${obj.price}`;

      const productCategories = document.createElement("p");
      productCategories.textContent =
        "Categories: " + obj.categories.map((cat) => cat.name).join(", ");

      productDiv.appendChild(productName);
      productDiv.appendChild(productPrice);
      productDiv.appendChild(productCategories);

      contentDiv.appendChild(productDiv);
      productDiv.appendChild(buttonDescription);
    }
  }
  const historyOrder = document.getElementById("history_order");
  historyOrder.addEventListener("click", function (event) {
    event.preventDefault();
    location.hash = "#/history/";
  });

  function goodFindOneMore(response) {
    const obj = response.data.GoodFindOne;
    const contentDiv = document.getElementById("contentGood");
    contentDiv.innerHTML = "";

    const productDiv = document.createElement("div");
    productDiv.classList.add("product");

    const productName = document.createElement("h3");
    productName.textContent = `Name: ${obj.name}`;

    const productPrice = document.createElement("p");
    productPrice.textContent = `Price: ${obj.price}`;

    const productDescription = document.createElement("p");
    productDescription.textContent = `Description: ${obj.description}`;

    const quantityLabel = document.createElement("label");
    quantityLabel.textContent = "Quantity:";
    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.value = 1;
    quantityInput.min = 1;

    const buttonBuy = document.createElement("button");
    buttonBuy.textContent = "Buy";
    buttonBuy.addEventListener("click", () => {
      const count = parseInt(quantityInput.value, 10);
      store.dispatch(actionCartAdd(obj, count));
    });

    productDiv.appendChild(productName);
    productDiv.appendChild(productPrice);
    productDiv.appendChild(productDescription);
    productDiv.appendChild(quantityLabel);
    productDiv.appendChild(quantityInput);
    productDiv.appendChild(buttonBuy);

    const productImages = document.createElement("div");
    for (const image of obj.images) {
      const img = document.createElement("img");
      img.src = "http://shop-roles.node.ed.asmer.org.ua/" + image.url;
      productImages.appendChild(img);
    }

    productDiv.appendChild(productImages);
    contentDiv.appendChild(productDiv);
  }
  function drawCart() {
    const state = store.getState();
    const cart = state.cart;
    const contentDiv = document.getElementById("contentGood");
    contentDiv.innerHTML = "";

    const cartItems = document.createElement("div");
    cartItems.classList.add("cart-items");

    let totalPrice = 0;

    for (const key in cart) {
      const { good, count } = cart[key];

      const productDiv = document.createElement("div");
      productDiv.classList.add("product");

      const productName = document.createElement("h3");
      productName.textContent = `Name: ${good.name}`;

      const productPrice = document.createElement("p");
      const totalProductPrice = good.price * count;
      productPrice.textContent = `Price: ${good.price} x ${count} = ${totalProductPrice}`;

      const productCount = document.createElement("input");
      productCount.type = "number";
      productCount.value = count;
      productCount.min = 1;
      productCount.addEventListener("change", (event) => {
        const newCount = parseInt(event.target.value, 10);
        store.dispatch(actionCartUpdateQuantity(good, newCount));
      });

      const buttonRemove = document.createElement("button");
      buttonRemove.textContent = "Remove";
      buttonRemove.addEventListener("click", () => {
        store.dispatch(actionCartDel(good));
      });

      productDiv.appendChild(productName);
      productDiv.appendChild(productPrice);
      productDiv.appendChild(productCount);
      productDiv.appendChild(buttonRemove);

      cartItems.appendChild(productDiv);
      totalPrice += totalProductPrice;
    }

    const totalDiv = document.createElement("div");
    totalDiv.classList.add("total-price");
    totalDiv.textContent = `Total Price: ${totalPrice}`;
    const sendOrder = document.createElement("button");
    sendOrder.textContent = "Send";
    sendOrder.addEventListener("click", () => {
      store.dispatch(actionFullOrder());
    });
    const buttonClearCart = document.createElement("button");
    buttonClearCart.textContent = "Clear Cart";
    buttonClearCart.addEventListener("click", () => {
      store.dispatch(actionCartClear());
    });

    contentDiv.appendChild(cartItems);
    contentDiv.appendChild(totalDiv);
    contentDiv.appendChild(buttonClearCart);
    contentDiv.appendChild(sendOrder);
  }

  const authReducer = (state = {}, { type, token }) => {
    if (type === "AUTH_LOGIN") {
      return { ...state, token };
    }
    if (type === "AUTH_LOGOUT") {
      return {};
    }
    return state;
  };

  const actionAuthLogin = (token) => ({ type: "AUTH_LOGIN", token });
  const actionAuthLogout = () => ({ type: "AUTH_LOGOUT" });

  const reducers = {
    promise: promiseReducer,
    auth: authReducer,
    cart: cartReducer,
  };

  const totalReducer = combineReducers(reducers);
  const store = createStore(totalReducer);
  store.subscribe(drawCategories);

  window.onhashchange = () => {
    const [_, route, id] = location.hash.split("/");

    const routes = {
      category() {
        clearContent();
        if (id) store.dispatch(actionGetCategoryOne(id));
        hideForms();
      },
      good() {
        clearContent();
        if (id) store.dispatch(actionGoodFindOne(id));
        hideForms();
      },
      register() {
        document.getElementById("registrationForm").style.display = "block";
        document.getElementById("loginForm").style.display = "none";
        clearContent();
      },
      login() {
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("registrationForm").style.display = "none";
        clearContent();
      },
      cart() {
        hideForms();
        clearContent();
        drawCart();
      },
      history() {
        hideForms();
        clearContent();
        drawHistory();
      },
      default() {
        hideForms();
        clearContent();
      },
    };

    (routes[route] || routes.default)();
  };
  const cartCountElement = document.getElementById("cartCount");
  function updateCartIcon() {
    const state = store.getState();
    const cart = state.cart;

    const totalItems = Object.values(cart).reduce(
      (sum, item) => sum + item.count,
      0
    );
    cartCountElement.textContent = totalItems;
  }

  store.dispatch(actionGetCategories());
  let card_basket = document.getElementById("button_basket");
  card_basket.addEventListener("click", function (event) {
    event.preventDefault();
    location.hash = "#/cart/";
  });

  let getButton_register = document.getElementById("button_head_register");
  let getButton_login = document.getElementById("button_head_login");
  getButton_register.addEventListener("click", function (event) {
    event.preventDefault();
    location.hash = "#/register";
  });
  getButton_login.addEventListener("click", function (event) {
    event.preventDefault();
    location.hash = "#/login";
  });

  function hideForms() {
    document.getElementById("registrationForm").style.display = "none";
    document.getElementById("loginForm").style.display = "none";
  }

  function clearContent() {
    document.getElementById("content").innerHTML = "";
    document.getElementById("contentGood").innerHTML = "";
  }

  const actionHistory = () => {
    return actionPromise(
      "history",
      gql("http://shop-roles.node.ed.asmer.org.ua/graphql", OrderFind).then(
        (response) => {
          if (response && response.data) {
            displayOrderHistory(response.data.OrderFind);
          } else {
            console.error("No data received from GraphQL query");
          }
        }
      )
    );
  };

  function displayOrderHistory(orders) {
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = "";

    if (!orders || orders.length === 0) {
      let noOrders = document.createElement("h2");
      noOrders.textContent = "No orders found";
      contentDiv.appendChild(noOrders);
      return;
    }

    orders.forEach((order) => {
      if (!order) return;

      let orderDiv = document.createElement("div");
      orderDiv.classList.add("order");

      let orderHeader = document.createElement("h3");
      orderHeader.textContent = `Order ID: ${order._id}, Total: ${
        order.total
      }, Created At: ${new Date(order.createdAt).toLocaleString()}`;
      orderDiv.appendChild(orderHeader);

      let orderGoodsList = document.createElement("ul");
      order.orderGoods.forEach((orderGood) => {
        if (!orderGood || !orderGood.good) return;

        let item = document.createElement("li");
        item.textContent = `Product: ${orderGood.good.name}, Price: ${orderGood.price}, Quantity: ${orderGood.count}, Total: ${orderGood.total}`;
        orderGoodsList.appendChild(item);
      });
      orderDiv.appendChild(orderGoodsList);

      if (order.owner) {
        let owner = document.createElement("p");
        owner.textContent = `Owner: ${order.owner.login}`;
        orderDiv.appendChild(owner);
      }

      contentDiv.appendChild(orderDiv);
    });
  }

  function drawHistory() {
    let contentDiv = document.getElementById("content");
    if (!localStorage.getItem("id")) {
      let card = document.createElement("h2");
      card.textContent = "Go login";
      contentDiv.appendChild(card);
    } else {
      store.dispatch(actionHistory());
    }
  }
  let previousCartState = store.getState().cart;

  store.subscribe(() => {
    updateCartIcon();
    const state = store.getState();
    if (state.cart !== previousCartState) {
      drawCart();
      previousCartState = state.cart;
    }
  });
  updateCartIcon();
  window.onhashchange();
})();
