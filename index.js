var express = require("express"); // เรียกใช้โมดูล express สำหรับสร้างแอปพลิเคชัน
var ejs = require("ejs"); // เรียกใช้โมดูล ejs สำหรับการเรนเดอร์หน้า HTML
var bodyParser = require("body-parser"); // เรียกใช้โมดูล body-parser สำหรับจัดการข้อมูลที่ส่งมาจากฟอร์ม
var mysql = require("mysql"); // เรียกใช้โมดูล mysql สำหรับการเชื่อมต่อกับฐานข้อมูล MySQL
var session = require("express-session"); // เรียกใช้โมดูล express-session สำหรับจัดการ session

// สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "node_project",
});

var app = express(); // สร้างแอปพลิเคชัน Express

// ตั้งค่า static files และ view engine
app.use(express.static("public")); // ใช้โฟลเดอร์ public สำหรับไฟล์ static
app.set("view engine", "ejs"); // ตั้งค่าให้ใช้ EJS เป็น template engine
app.set("views", "views"); // ตั้งค่าโฟลเดอร์สำหรับไฟล์ views

app.listen(8080); // เริ่มต้นเซิร์ฟเวอร์ที่พอร์ต 8080
app.use(bodyParser.urlencoded({ extended: true })); // ใช้ body-parser เพื่อจัดการข้อมูลที่ส่งมาจากฟอร์ม
app.use(session({ secret: "secret", resave: false, saveUninitialized: false })); // ตั้งค่า session

// ฟังก์ชันตรวจสอบว่าสินค้าอยู่ในตะกร้าหรือไม่
function isProductInCart(cart, id) {
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id == id) {
      return true; // ถ้าสินค้าอยู่ในตะกร้าให้คืนค่า true
    }
  }
  return false; // ถ้าไม่พบสินค้าให้คืนค่า false
}

// ฟังก์ชันคำนวณราคารวมของสินค้าในตะกร้า
function calculateTotal(cart, req) {
  let total = 0; // เริ่มต้นราคารวมเป็น 0
  for (let i = 0; i < cart.length; i++) {
    // ถ้าสินค้ามีราคาลดพิเศษ
    if (cart[i].sale_price) {
      total += cart[i].sale_price * cart[i].quantity; // คำนวณราคารวมจากราคาลด
    } else {
      total += cart[i].price * cart[i].quantity; // คำนวณราคารวมจากราคาเต็ม
    }
  }
  req.session.total = total; // เก็บราคารวมใน session
  return total; // คืนค่าราคารวม
}

// เส้นทางหลัก (หน้าแรก)
app.get("/", function (req, res) {
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  // ดึงข้อมูลสินค้าจากฐานข้อมูล
  con.query("SELECT * FROM products", (err, result) => {
    res.render("pages/index", { result: result }); // เรนเดอร์หน้า index.ejs พร้อมข้อมูลสินค้า
  });
});

// เส้นทางสำหรับ redirect ไปยังหน้า index
app.get("/index", function (req, res) {
  res.redirect("/"); // เปลี่ยนเส้นทางไปยังหน้าแรก
});

// เส้นทางสำหรับหน้า about
app.get("/about", function (req, res) {
  res.render("pages/about"); // เรนเดอร์หน้า about.ejs
});

// เส้นทางสำหรับหน้า design
app.get("/design", function (req, res) {
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  // ดึงข้อมูลสินค้าจากฐานข้อมูล
  con.query("SELECT * FROM products", (err, result) => {
    res.render("pages/design", { result: result }); // เรนเดอร์หน้า design.ejs พร้อมข้อมูลสินค้า
  });
});

// เส้นทางสำหรับหน้า shop
app.get("/shop", function (req, res) {
  res.render("pages/shop"); // เรนเดอร์หน้า shop.ejs
});

// เส้นทางสำหรับแสดงหน้า contact
app.get("/contact", function (req, res) {
  res.render("pages/contact"); // เรนเดอร์หน้า contact.ejs ในโฟลเดอร์ pages
});

// เส้นทางสำหรับเพิ่มสินค้าลงในตะกร้า
app.post("/add_to_cart", function (req, res) {
  var id = req.body.id; // รับ id ของสินค้าจากฟอร์ม
  var name = req.body.name; // รับชื่อสินค้าจากฟอร์ม
  var price = parseFloat(req.body.price); // รับราคาเต็มและแปลงเป็นจำนวนจริง
  var sale_price = req.body.sale_price ? parseFloat(req.body.sale_price) : null; // รับราคาลดถ้ามีและแปลงเป็นจำนวนจริง
  var quantity = 1; // ตั้งค่าจำนวนเริ่มต้นเป็น 1
  var image = req.body.image; // รับ URL ของภาพสินค้าจากฟอร์ม

  // สร้างอ็อบเจ็กต์ product สำหรับเก็บข้อมูลสินค้า
  var product = {
    id: id,
    name: name,
    price: price,
    sale_price: sale_price,
    quantity: quantity, // ใช้ค่า quantity ที่ตั้งเป็น 1
    image: image,
  };

  // ตรวจสอบว่ามีตะกร้าอยู่ใน session หรือไม่
  if (req.session.cart) {
    var cart = req.session.cart; // ดึงตะกร้าจาก session

    // ตรวจสอบว่าสินค้าอยู่ในตะกร้าหรือไม่
    if (!isProductInCart(cart, id)) {
      cart.push(product); // ถ้าไม่อยู่ในตะกร้าให้เพิ่มสินค้าเข้าไป
    } else {
      // ถ้าสินค้าอยู่ในตะกร้าแล้ว เพิ่มจำนวน
      cart.forEach((item) => {
        if (item.id == id) {
          item.quantity += 1; // เพิ่มจำนวนสินค้าในตะกร้า
        }
      });
    }
  } else {
    // ถ้ายังไม่มีตะกร้าใน session ให้สร้างตะกร้าใหม่
    req.session.cart = [product]; // ตั้งค่าให้ตะกร้าเริ่มต้นด้วยสินค้าที่เพิ่มเข้ามา
  }

  // คำนวณราคารวมของสินค้าในตะกร้า
  calculateTotal(req.session.cart, req); // ส่ง cart และ req เป็นอาร์กิวเมนต์

  // เปลี่ยนเส้นทางไปยังหน้า cart
  res.redirect("/cart"); // ส่งผู้ใช้ไปยังหน้า cart
});

app.get("/cart", function (req, res) {
  // ถ้า `req.session.cart` ยังไม่มีค่า ให้ตั้งค่า `cart` เป็นอาร์เรย์ว่าง
  var cart = req.session.cart || [];

  // ถ้า `req.session.total` ยังไม่มีค่า ให้ตั้งค่า `total` เป็น 0
  var total = req.session.total || 0;

  res.render("pages/cart", { cart: cart, total: total });
});

app.post("/remove_product", function (req, res) {
  var id = req.body.id;
  var cart = req.session.cart;

  // ตรวจสอบว่า cart เป็นอาร์เรย์และมีสินค้าอยู่ในนั้น
  if (cart) {
    for (let i = 0; i < cart.length; i++) {
      if (cart[i].id == id) {
        cart.splice(i, 1); // ลบสินค้าโดยใช้ตำแหน่ง `i`
        break; // หยุด loop เมื่อพบสินค้าแล้วลบออก
      }
    }

    // re-calculate total
    calculateTotal(cart, req);
  }

  res.redirect("/cart");
});

// เส้นทางสำหรับแก้ไขจำนวนสินค้าที่อยู่ในตะกร้า
app.post("/edit_product_quantity", function (req, res) {
  var id = req.body.id; // รับ id ของสินค้าที่ต้องการแก้ไขจำนวน
  var increase_btn = req.body.increase_product_quantity; // รับค่าจากปุ่มเพิ่มจำนวน
  var decrease_btn = req.body.decrease_product_quantity; // รับค่าจากปุ่มลดจำนวน

  var cart = req.session.cart; // ดึงตะกร้าจาก session

  // ตรวจสอบว่าตะกร้ามีอยู่หรือไม่
  if (cart) {
    // วน loop เพื่อตรวจสอบสินค้าทั้งหมดในตะกร้า
    for (let i = 0; i < cart.length; i++) {
      if (cart[i].id == id) { // ถ้าพบสินค้าที่ต้องการแก้ไข
        if (increase_btn) {
          cart[i].quantity = parseInt(cart[i].quantity) + 1; // เพิ่มจำนวนสินค้า
        }

        if (decrease_btn) {
          // ตรวจสอบว่าจำนวนสินค้าจะไม่ต่ำกว่าหนึ่ง
          if (cart[i].quantity > 1) {
            cart[i].quantity = parseInt(cart[i].quantity) - 1; // ลดจำนวนสินค้า
          }
        }
        break; // หยุด loop เมื่อพบสินค้าแล้ว
      }
    }
  }

  // คำนวณราคารวมของสินค้าในตะกร้า
  calculateTotal(cart, req); // ส่ง cart และ req เป็นอาร์กิวเมนต์

  // เปลี่ยนเส้นทางไปยังหน้า cart
  res.redirect("/cart"); // ส่งผู้ใช้ไปยังหน้า cart
});

// เส้นทางสำหรับแสดงหน้าชำระเงิน
app.get("/checkout", function (req, res) {
  var total = req.session.total; // ดึงราคารวมจาก session
  res.render("pages/checkout", { total: total }); // เรนเดอร์หน้า checkout.ejs พร้อมราคารวม
});

// เส้นทางสำหรับการสั่งซื้อสินค้า
app.post("/place_order", function (req, res) {
  // รับข้อมูลจากฟอร์มสั่งซื้อ
  var name = req.body.name; // ชื่อผู้สั่งซื้อ
  var email = req.body.email; // อีเมลผู้สั่งซื้อ
  var phone = req.body.phone; // หมายเลขโทรศัพท์ผู้สั่งซื้อ
  var city = req.body.city; // เมืองที่อยู่
  var address = req.body.address; // ที่อยู่
  var cost = req.session.total; // ราคารวมจาก session
  var status = "not paid"; // สถานะการชำระเงิน
  var date = new Date(); // วันที่สั่งซื้อ
  var products_ids = ""; // สตริงสำหรับเก็บ ID ของสินค้าที่สั่งซื้อ

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  var cart = req.session.cart; // ดึงตะกร้าจาก session
  // วน loop เพื่อสร้างสตริงของ ID สินค้าที่สั่งซื้อ
  for (let i = 0; i < cart.length; i++) {
    products_ids = products_ids + "," + cart[i].id; // เพิ่ม ID ของแต่ละสินค้าในตะกร้า
  }

  // เชื่อมต่อกับฐานข้อมูล
  con.connect((err) => {
    if (err) {
      console.log(err); // แสดงข้อผิดพลาดถ้ามี
    } else {
      // สร้างคำสั่ง SQL สำหรับการเพิ่มข้อมูลคำสั่งซื้อ
      var query =
        "INSERT INTO orders(cost,name,email,status,city,address,phone,date,products_ids) VALUES ?";
      var values = [
        [cost, name, email, status, city, address, phone, date, products_ids],
      ];

      // ดำเนินการคำสั่ง SQL
      con.query(query, [values], (err, result) => {
        res.redirect("/payment"); // เปลี่ยนเส้นทางไปยังหน้า payment
      });
    }
  });
});

// เส้นทางสำหรับแสดงหน้าชำระเงิน
app.get("/payment", function (req, res) {
  var total = req.session.total; // ดึงราคารวมจาก session
  res.render("pages/payment", { total: total }); // เรนเดอร์หน้า payment.ejs พร้อมราคารวม
});

// เส้นทางสำหรับแสดงสถานะการสั่งซื้อ
app.get("/order-status", function (req, res) {
  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  const query = "SELECT * FROM orders"; // คำสั่ง SQL สำหรับดึงข้อมูลคำสั่งซื้อทั้งหมด

  // ดำเนินการคำสั่ง SQL
  con.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err); // แสดงข้อผิดพลาดถ้ามี
      return res.status(500).send("Error fetching orders"); // ส่งสถานะ 500 ถ้ามีข้อผิดพลาด
    }

    // ส่งข้อมูลคำสั่งซื้อไปยังหน้า order-status
    res.render("pages/order-status", { orders: results || [] }); // เรนเดอร์หน้า order-status.ejs พร้อมข้อมูลคำสั่งซื้อ

    // ปิดการเชื่อมต่อ
    con.end((err) => {
      if (err) {
        console.error("Error ending the connection:", err); // แสดงข้อผิดพลาดถ้ามี
      }
    });
  });
});

// เส้นทางสำหรับค้นหาสินค้า
app.get("/search", (req, res) => {
  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  const query = req.query.q; // รับคำค้นหาจาก query parameter

  // คำสั่ง SQL เพื่อค้นหาสินค้าจากฐานข้อมูล
  const sql = `SELECT * FROM products WHERE name LIKE ?`;

  // ดึงข้อมูลจากฐานข้อมูลโดยใช้คำค้นหา
  con.query(sql, [`%${query}%`], (err, results) => {
    if (err) {
      return res.status(500).send("Database error: " + err); // ส่งสถานะ 500 ถ้ามีข้อผิดพลาด
    }

    // ส่งผลลัพธ์ไปยังหน้า search_result.ejs
    res.render("pages/search_results", { result: results }); // เรนเดอร์หน้า search_results.ejs พร้อมผลลัพธ์การค้นหา
  });
});

app.post("/send", (req, res) => {
  const { name, email, phone, message } = req.body;

  // เก็บข้อมูลตามที่ต้องการ เช่น บันทึกในฐานข้อมูลหรือส่งอีเมล
  console.log(
    `Name: ${name}, Email: ${email}, Phone: ${phone}, Message: ${message}`
  );

  // ส่งข้อความกลับไปยังฟอร์มเดิม
  res.render("contact", {
    successMessage: "ข้อความของคุณถูกส่งเรียบร้อยแล้ว!",
  });
});

// login route
// เส้นทางสำหรับแสดงหน้าล็อกอิน
app.get("/login", (req, res) => {
  res.render("pages/login"); // เรนเดอร์หน้า login.ejs
});

// เส้นทางสำหรับประมวลผลการล็อกอิน
app.post("/login", (req, res) => {
  // รับข้อมูลจากฟอร์มล็อกอิน
  const { username, password } = req.body; // ใช้ destructuring เพื่อดึงค่า username และ password

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  // คำสั่ง SQL สำหรับตรวจสอบข้อมูลผู้ใช้
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  
  // ดำเนินการค้นหาผู้ใช้ในฐานข้อมูล
  con.query(query, [username, password], (err, results) => {
    if (err) {
      // ถ้ามีข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล
      return res.status(500).send("Database error: " + err);
    }

    // ตรวจสอบว่าพบผู้ใช้ในฐานข้อมูลหรือไม่
    if (results.length > 0) {
      // ถ้าพบผู้ใช้ (ล็อกอินสำเร็จ)
      req.session.loggedIn = true; // เก็บสถานะการล็อกอินใน session
      req.session.username = username; // เก็บชื่อผู้ใช้ใน session
      res.redirect("/"); // เปลี่ยนเส้นทางไปยังหน้าหลัก
    } else {
      // ถ้าไม่พบผู้ใช้ (ล็อกอินไม่สำเร็จ)
      res.send("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"); // แสดงข้อความแจ้งเตือน
    }
  });
});

// สร้างหน้า signup
app.get("/signup", (req, res) => {
  res.render("pages/signup");
});

// ประมวลผลข้อมูล Sign Up
app.post("/signup", (req, res) => {
  const { username, password, email } = req.body;

  // สร้างการเชื่อมต่อฐานข้อมูล MySQL
  const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  // เพิ่มข้อมูลผู้ใช้ใหม่ในฐานข้อมูล
  const query =
    "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
  con.query(query, [username, password, email], (err, result) => {
    if (err) {
      console.log("Error inserting data: ", err);
      return res.status(500).send("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }

    res.redirect("/login");
  });
});

//contact function
// สร้างเส้นทางเพื่อรับข้อมูลจากฟอร์ม
// เส้นทางสำหรับประมวลผลการส่งฟอร์ม
app.post("/submit-form", (req, res) => {
  // รับข้อมูลจากฟอร์มที่ผู้ใช้กรอก
  const { name, email, phone, message } = req.body;

  // สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
  const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project",
  });

  // ตรวจสอบว่าข้อมูลที่จำเป็นทั้งหมดถูกกรอกหรือไม่
  if (!name || !email || !phone || !message) {
    // ถ้ามีข้อมูลที่ขาดหายไป ส่งสถานะ 400 พร้อมข้อความแจ้งเตือน
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  // คำสั่ง SQL สำหรับเพิ่มข้อมูลลงในตาราง contacts
  const query =
    "INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)";
  
  // ดำเนินการคำสั่ง SQL เพื่อบันทึกข้อมูล
  con.query(query, [name, email, phone, message], (err, result) => {
    if (err) {
      // ถ้ามีข้อผิดพลาดในการบันทึกข้อมูล
      console.error("Error occurred while inserting data:", err); // แสดงข้อผิดพลาดใน console
      return res.status(500).send("ไม่สามารถบันทึกข้อมูลได้"); // ส่งสถานะ 500 พร้อมข้อความแจ้งเตือน
    } else {
      // ถ้าบันทึกข้อมูลสำเร็จ
      res.redirect("/contact?success=true"); // เปลี่ยนเส้นทางไปยังหน้า contact พร้อม query parameter success
    }
  });
});
