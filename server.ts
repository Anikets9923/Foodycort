import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import dotenv from "dotenv";
import { initializeApp as initializeAppWeb } from "firebase/app";
import { 
  getFirestore as getFirestoreWeb, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc as firestoreDoc, 
  getDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const webApp = initializeAppWeb(firebaseConfig);
const db = getFirestoreWeb(webApp, firebaseConfig.firestoreDatabaseId);
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_for_dev_only";

// Ensure local uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Limit body size for base64 photo uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));
  
  // Serve uploaded assets statically
  app.use("/uploads", express.static(uploadsDir));

  // Socket.io connection helper
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
    });
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Access denied" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.error("JWT Verification Error:", err.message || err);
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = user;
      next();
    });
  };

  const authorizeRole = (role: string) => {
    return (req: any, res: any, next: any) => {
      if (req.user.role !== role) {
        return res.status(403).json({ message: `Access denied: Requires ${role} role` });
      }
      next();
    };
  };

  // Helper: push local real-time app notification
  const createNotification = async (userId: string, title: string, message: string, type: string) => {
    try {
      const payload = {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "notifications"), payload);
      io.to(userId).emit("new-notification", payload);
    } catch (err) {
      console.error("Failed to commit notification:", err);
    }
  };

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role, stallName } = req.body;

      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        name,
        email,
        password: hashedPassword,
        role,
        stallName: stallName || null,
        createdAt: new Date().toISOString(),
      };

      const userDoc = await addDoc(collection(db, "users"), newUser);
      
      if (role === "vendor") {
        await addDoc(collection(db, "stalls"), {
          vendorId: userDoc.id,
          stallName: stallName || `${name}'s Stall`,
          description: "Welcome to our stall!",
          category: "General",
          isOpen: true,
          isApproved: false, // Default unapproved for admin panel verification
          avgRating: 5.0,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(userDoc.id)}`,
          createdAt: new Date().toISOString(),
        });

        // Notify admins regarding new registration
        await createNotification("admin", "New Stall Registration", `${name} signed up with stall name: ${stallName}!`, "vendor_signup");
      }

      res.status(201).json({ message: "User registered successfully" });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Special administrator backdoor to test the system without manual DB creation and keys setup
      if (email === "admin@quickbite.com") {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        
        let targetId = "";
        if (snapshot.empty) {
          const hashedPassword = await bcrypt.hash("admin123", 10);
          const adminDoc = await addDoc(collection(db, "users"), {
            name: "Super Admin",
            email: "admin@quickbite.com",
            password: hashedPassword,
            role: "admin",
            createdAt: new Date().toISOString()
          });
          targetId = adminDoc.id;
        } else {
          targetId = snapshot.docs[0].id;
        }

        const token = jwt.sign(
          { id: targetId, email: "admin@quickbite.com", role: "admin" },
          JWT_SECRET,
          { expiresIn: "30d" }
        );
        return res.json({
          token,
          user: { id: targetId, name: "Super Admin", email: "admin@quickbite.com", role: "admin" },
        });
      }

      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return res.status(400).json({ message: "User not found" });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      const validPassword = await bcrypt.compare(password, userData.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid password" });
      }

      const token = jwt.sign(
        { id: userDoc.id, email: userData.email, role: userData.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        token,
        user: { id: userDoc.id, name: userData.name, email: userData.email, role: userData.role },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Image Upload endpoint (Phase 2 Local serving representation)
  app.post("/api/upload", authenticateToken, async (req, res) => {
    try {
      const { imageBase64, name } = req.body;
      if (!imageBase64) return res.status(400).json({ message: "No image file parsed" });

      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ message: "Invalid base64 format" });
      }

      const buffer = Buffer.from(matches[2], "base64");
      const extension = matches[1].split("/")[1] || "png";
      const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      
      const serverUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
      res.json({ url: serverUrl });
    } catch (err: any) {
      console.error("Image upload error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Stalls: GET all (filtered by approval flag except for admin endpoints)
  app.get("/api/stalls", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "stalls"));
      const stalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(stalls);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Stalls: GET by ID
  app.get("/api/stalls/:id", async (req, res) => {
    try {
      const sDoc = await getDoc(firestoreDoc(db, "stalls", req.params.id));
      if (!sDoc.exists()) return res.status(404).json({ message: "Stall not found" });
      
      const menuSnapshot = await getDocs(collection(db, `stalls/${req.params.id}/menu`));
      const menuItems = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ id: sDoc.id, ...sDoc.data(), menuItems });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // QR System Ordering (Phase 9 Table selection & dynamic checkout)
  app.get("/api/stalls/qr/:id", async (req, res) => {
    try {
      const sDoc = await getDoc(firestoreDoc(db, "stalls", req.params.id));
      if (!sDoc.exists()) return res.status(404).json({ message: "Stall not found" });
      res.json({
        id: sDoc.id,
        stallName: sDoc.data().stallName,
        qrCodeUrl: sDoc.data().qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(sDoc.id)}`
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Orders: POST (direct checkout orders)
  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    try {
      const { stallId, items, totalPrice, tableId, notes, couponApplied, prepTime, paymentMethod, paymentStatus } = req.body;
      const order = {
        customerId: req.user.id,
        customerName: req.user.name || "Customer",
        customerEmail: req.user.email || "customer@quickbite.com",
        stallId,
        items,
        totalPrice,
        status: "pending",
        paymentStatus: paymentStatus || "pending",
        paymentMethod: paymentMethod || "cash",
        tableId: tableId || "TakeAway",
        notes: notes || "",
        couponApplied: couponApplied || null,
        prepTime: prepTime || 15,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "orders"), order);
      io.to(stallId).emit("new-order", { id: docRef.id, ...order });
      
      if (order.paymentMethod === "cash") {
        await createNotification(req.user.id, "Order Placed Successfully", `Your order of ₹${totalPrice.toFixed(2)} is placed! Please pay at the counter during pickup.`, "order_created");
        await createNotification(stallId, "New Cash Order Received", `A new cash-on-counter order has been requested for Table ${tableId || "TakeAway"}!`, "new_order");
      } else {
        await createNotification(req.user.id, "Order Placed", `Your order of ₹${totalPrice.toFixed(2)} has been placed successfully.`, "order_created");
        await createNotification(stallId, "New Order Received", `A new order has been received!`, "new_order");
      }
      
      res.status(201).json({ id: docRef.id, ...order });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Unified multi-stall split checkout engine
  app.post("/api/checkout/unified", authenticateToken, async (req: any, res) => {
    try {
      const { cart: groupedCart, tableId, notes, coupons, paymentMethod, paymentStatus } = req.body;
      
      if (!groupedCart || typeof groupedCart !== "object" || Object.keys(groupedCart).length === 0) {
        return res.status(400).json({ message: "Cart cannot be empty for unified checkout." });
      }
      
      const batch = writeBatch(db);
      
      const checkoutSessionRef = firestoreDoc(collection(db, "checkout_sessions"));
      const checkoutSessionId = checkoutSessionRef.id;
      
      const baseOrderNum = 1000 + Math.floor(Math.random() * 9000);
      let grandTotal = 0;
      const shardedOrderIds: string[] = [];
      const socketEventsToEmit: any[] = [];
      
      const stallKeys = Object.keys(groupedCart);
      
      for (let idx = 0; idx < stallKeys.length; idx++) {
        const stallId = stallKeys[idx];
        const items = groupedCart[stallId];
        if (!Array.isArray(items) || items.length === 0) continue;
        
        // Calculate vendor-specific subtotals
        const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
        const tax = subtotal * 0.1; // 10% VAT
        
        // Calculate optional coupon discounts per stall if provided in coupons map
        let discount = 0;
        const couponCode = coupons && coupons[stallId] ? coupons[stallId].code : null;
        if (coupons && coupons[stallId]) {
          const coup = coupons[stallId];
          if (coup.type === "percent") {
            discount = (subtotal + tax) * (coup.value / 100);
          } else {
            discount = Math.min(subtotal + tax, coup.value);
          }
        }
        
        const totalForStall = Math.max(0, subtotal + tax - discount);
        grandTotal += totalForStall;
        
        const suffix = String.fromCharCode(65 + (idx % 26)); // Unique letter per vendor ticket (e.g., #4321-A, #4321-B)
        const orderNumber = `#${baseOrderNum}-${suffix}`;
        
        const orderRef = firestoreDoc(collection(db, "orders"));
        const orderId = orderRef.id;
        
        const orderDoc = {
          checkoutSessionId,
          orderNumber,
          customerId: req.user.id,
          customerName: req.user.name || "Customer",
          customerEmail: req.user.email || "customer@quickbite.com",
          stallId,
          stallName: items[0].stallName || "Vendor Stall",
          items,
          totalPrice: totalForStall,
          status: "pending",
          paymentStatus: paymentStatus || "pending",
          paymentMethod: paymentMethod || "cash",
          tableId: tableId || "TakeAway",
          notes: notes || "",
          couponApplied: couponCode,
          prepTime: 15,
          createdAt: new Date().toISOString()
        };
        
        batch.set(orderRef, orderDoc);
        shardedOrderIds.push(orderId);
        
        // Prepare socket actions to emit upon successful batch commit
        socketEventsToEmit.push({
          stallId,
          orderId,
          orderData: orderDoc
        });
      }
      
      // Set the parent checkout_sessions document inside database
      const checkoutSessionDoc = {
        id: checkoutSessionId,
        customerId: req.user.id,
        customerName: req.user.name || "Customer",
        customerEmail: req.user.email || "customer@quickbite.com",
        totalPrice: grandTotal,
        paymentStatus: paymentStatus === "paid" ? "paid" : "pending_counter_payment",
        paymentMethod: paymentMethod || "cash",
        tableId: tableId || "TakeAway",
        notes: notes || "",
        createdAt: new Date().toISOString()
      };
      
      batch.set(checkoutSessionRef, checkoutSessionDoc);
      
      // Commit the complete atomic write batch
      await batch.commit();
      
      // Run socket broadcasts and notification pushes after committing
      for (const ev of socketEventsToEmit) {
        // Emit only to specific vendor's Socket.io room
        io.to(ev.stallId).emit("new-order", { id: ev.orderId, ...ev.orderData });
        
        // Generate notifications inside the system
        await createNotification(
          ev.stallId,
          "New Split Ticket Received",
          `A split ticket ${ev.orderData.orderNumber} (₹${ev.orderData.totalPrice.toFixed(2)}) is requested for Table ${tableId || "TakeAway"}.`,
          "new_order"
        );
      }
      
      // Send notification back to customer
      await createNotification(
        req.user.id,
        "Order Split Placed Successfully",
        `Your unified checkout order of ₹${grandTotal.toFixed(2)} split across ${shardedOrderIds.length} stalls is placed!`,
        "order_created"
      );
      
      // Notify Admin
      await createNotification(
        "admin",
        "Unified Multi-Stall Order Created",
        `A multi-stall order of ₹${grandTotal.toFixed(2)} is generated. Checkout ID: ${checkoutSessionId}`,
        "new_order"
      );
      
      return res.status(201).json({
        checkoutSessionId,
        grandTotal,
        shardedOrderIds
      });
    } catch (err: any) {
      console.error("Unified checkout submission error:", err);
      return res.status(500).json({ message: err.message || "An unexpected error occurred during checkout." });
    }
  });

  // Orders: Customer orders list
  app.get("/api/orders/customer/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.id !== req.params.id) return res.status(403).json({ message: "Forbidden" });
      const q = query(collection(db, "orders"), where("customerId", "==", req.params.id));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Orders: Vendor orders list 
  app.get("/api/orders/vendor/:stallId", authenticateToken, authorizeRole("vendor"), async (req: any, res) => {
    try {
      const q = query(collection(db, "orders"), where("stallId", "==", req.params.stallId));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Orders: Update status & queue mapping
  app.put("/api/orders/:id/status", authenticateToken, async (req: any, res) => {
    try {
      const { status, prepTime, paymentStatus } = req.body;
      const orderRef = firestoreDoc(db, "orders", req.params.id);
      
      const payload: any = {};
      if (status !== undefined) {
        payload.status = status;
      }
      if (prepTime !== undefined) {
        payload.prepTime = prepTime;
      }
      if (paymentStatus !== undefined) {
        payload.paymentStatus = paymentStatus;
      }
      
      await updateDoc(orderRef, payload);
      const updatedSnap = await getDoc(orderRef);
      const updatedOrder = updatedSnap.data();
      
      // Notify customer of update via client WebSocket rooms
      if (status) {
        io.to(updatedOrder?.customerId).emit("order-status-updated", { id: req.params.id, status, prepTime });
        
        // Create permanent notification logs
        await createNotification(
          updatedOrder?.customerId, 
          `Order ${status.toUpperCase()}`, 
          `Your meal state status is now: ${status}${prepTime ? `. Preparing time: ${prepTime}-mins.` : ""}`, 
          `order_${status}`
        );
      }

      if (paymentStatus === "paid") {
        await createNotification(
          updatedOrder?.customerId,
          "Payment Confirmed",
          `We have successfully received your payment of ₹${updatedOrder?.totalPrice?.toFixed(2)} at the counter!`,
          "payment_success"
        );
      }
      
      res.json({ id: req.params.id, ...updatedOrder });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Menu: Add
  app.post("/api/menu", authenticateToken, authorizeRole("vendor"), async (req: any, res) => {
    try {
      const { stallId, itemName, description, price, imageUrl, category } = req.body;
      const newItem = { itemName, description, price: Number(price), imageUrl, category, available: true };
      const docRef = await addDoc(collection(db, `stalls/${stallId}/menu`), newItem);
      res.status(201).json({ id: docRef.id, ...newItem });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Menu: Toggle Availability / Edit
  app.put("/api/menu/:stallId/:id", authenticateToken, authorizeRole("vendor"), async (req: any, res) => {
    try {
      const { itemName, description, price, imageUrl, category, available } = req.body;
      const itemRef = firestoreDoc(db, `stalls/${req.params.stallId}/menu`, req.params.id);
      const payload: any = {};
      if (itemName !== undefined) payload.itemName = itemName;
      if (description !== undefined) payload.description = description;
      if (price !== undefined) payload.price = Number(price);
      if (imageUrl !== undefined) payload.imageUrl = imageUrl;
      if (category !== undefined) payload.category = category;
      if (available !== undefined) payload.available = available;

      await updateDoc(itemRef, payload);
      res.json({ id: req.params.id, ...payload });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Menu: Delete
  app.delete("/api/menu/:stallId/:id", authenticateToken, authorizeRole("vendor"), async (req: any, res) => {
    try {
      const itemRef = firestoreDoc(db, `stalls/${req.params.stallId}/menu`, req.params.id);
      await deleteDoc(itemRef);
      res.json({ message: "Menu item deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Stall: Update details (isOpen, categories, descriptions, images)
  app.put("/api/stalls/update/:id", authenticateToken, authorizeRole("vendor"), async (req: any, res) => {
    try {
      const { stallName, description, category, isOpen, imageUrl } = req.body;
      const ref = firestoreDoc(db, "stalls", req.params.id);
      const payload: any = {};
      if (stallName !== undefined) payload.stallName = stallName;
      if (description !== undefined) payload.description = description;
      if (category !== undefined) payload.category = category;
      if (isOpen !== undefined) payload.isOpen = isOpen;
      if (imageUrl !== undefined) payload.imageUrl = imageUrl;

      await updateDoc(ref, payload);
      res.json({ id: req.params.id, ...payload });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Reviews and Rating collections (Phase 10)
  app.get("/api/reviews/:stallId", async (req, res) => {
    try {
      const q = query(collection(db, "reviews"), where("stallId", "==", req.params.stallId));
      const s = await getDocs(q);
      const reviews = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews", authenticateToken, async (req: any, res) => {
    try {
      const { stallId, rating, comment, imageUrl } = req.body;
      const reviewPayload = {
        customerId: req.user.id,
        customerName: req.user.name || "Happy Foodie",
        stallId,
        rating: Number(rating),
        comment: comment || "",
        reply: "",
        imageUrl: imageUrl || null,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "reviews"), reviewPayload);
      
      // Calculate average rating dynamically for stall
      const q = query(collection(db, "reviews"), where("stallId", "==", stallId));
      const sStatus = await getDocs(q);
      const ratingsList = sStatus.docs.map(doc => doc.data().rating);
      const avg = ratingsList.length > 0 ? ratingsList.reduce((acc, current) => acc + current, 0) / ratingsList.length : Number(rating);
      
      const sRef = firestoreDoc(db, "stalls", stallId);
      await updateDoc(sRef, { avgRating: Number(avg.toFixed(1)) });

      await createNotification(stallId, "New Review Received", `Someone rated your stall with ${rating} stars!`, "review_added");

      res.status(201).json({ id: docRef.id, ...reviewPayload });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews/:id/reply", authenticateToken, authorizeRole("vendor"), async (req: any, res) => {
    try {
      const { reply } = req.body;
      const reviewRef = firestoreDoc(db, "reviews", req.params.id);
      await updateDoc(reviewRef, { reply });
      res.json({ id: req.params.id, reply });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Coupons and discount systems (Phase 12)
  app.get("/api/coupons/:stallId", async (req, res) => {
    try {
      // Find all coupons associated with a stall or general admin coupons
      const q = query(collection(db, "coupons"), where("stallId", "==", req.params.stallId));
      const snapshot = await getDocs(q);
      const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(coupons);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/coupons", authenticateToken, async (req: any, res) => {
    try {
      const { code, type, value, active, expiresAt, stallId } = req.body;
      const newCoupon = {
        code: code.toUpperCase(),
        type,
        value: Number(value),
        active: active !== undefined ? active : true,
        expiresAt: expiresAt || null,
        stallId
      };
      const docRef = await addDoc(collection(db, "coupons"), newCoupon);
      res.status(201).json({ id: docRef.id, ...newCoupon });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/coupons/apply", authenticateToken, async (req, res) => {
    try {
      const { code, stallId } = req.body;
      const q = query(collection(db, "coupons"), where("code", "==", code.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return res.status(400).json({ message: "Coupon code does not exist" });
      }

      const couponDoc = snap.docs[0];
      const couponData = couponDoc.data();

      if (!couponData.active) {
        return res.status(400).json({ message: "Coupon is inactive" });
      }

      if (couponData.stallId !== "all" && couponData.stallId !== stallId) {
        return res.status(400).json({ message: "Coupon is not applicable to this stall's products" });
      }

      res.json({ id: couponDoc.id, ...couponData });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Favorites tracking (Phase 11)
  app.get("/api/favorites", authenticateToken, async (req: any, res) => {
    try {
      const q = query(collection(db, "favorites"), where("userId", "==", req.user.id));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data().stallId);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/favorites/toggle", authenticateToken, async (req: any, res) => {
    try {
      const { stallId } = req.body;
      const q = query(collection(db, "favorites"), where("userId", "==", req.user.id), where("stallId", "==", stallId));
      const snap = await getDocs(q);

      if (!snap.empty) {
        await deleteDoc(firestoreDoc(db, "favorites", snap.docs[0].id));
        res.json({ favorited: false });
      } else {
        await addDoc(collection(db, "favorites"), {
          userId: req.user.id,
          stallId,
          createdAt: new Date().toISOString()
        });
        res.json({ favorited: true });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Notifications API
  app.get("/api/notifications", authenticateToken, async (req: any, res) => {
    try {
      const q = query(collection(db, "notifications"), where("userId", "==", req.user.id));
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Also support fetching global notifications
      const qAdmin = query(collection(db, "notifications"), where("userId", "==", "admin"));
      const snapAdmin = req.user.role === "admin" ? await getDocs(qAdmin) : null;
      if (snapAdmin) {
        logs.push(...snapAdmin.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      res.json(logs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/notifications/read-all", authenticateToken, async (req: any, res) => {
    try {
      const q = query(collection(db, "notifications"), where("userId", "==", req.user.id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(firestoreDoc(db, "notifications", d.id), { read: true });
      }
      res.json({ message: "marked all read" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });


  // --- ADMIN MODULE APIs (Phase 3 System-Level Controls) ---
  const authenticateAdmin = [authenticateToken, authorizeRole("admin")];

  // Admin users manager
  app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(usersList);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin vendors/stalls approval listing
  app.get("/api/admin/vendors", authenticateAdmin, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "stalls"));
      const stallsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(stallsList);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin vendor approval toggle
  app.put("/api/admin/vendor/approve/:id", authenticateAdmin, async (req, res) => {
    try {
      const { isApproved } = req.body;
      const ref = firestoreDoc(db, "stalls", req.params.id);
      await updateDoc(ref, { isApproved });
      
      const sDoc = await getDoc(ref);
      const vendorUid = sDoc.data()?.vendorId;
      if (vendorUid) {
        await createNotification(
          vendorUid, 
          "Stall Approval Updated", 
          `Your stall "${sDoc.data()?.stallName}" has been ${isApproved ? "Approved by QuickBite Admin! Welcome aboard!" : "suspended by Admin moderation."}`,
          "approval_status"
        );
      }

      res.json({ id: req.params.id, isApproved });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin Delete/Moderate stall
  app.delete("/api/admin/stall/:id", authenticateAdmin, async (req, res) => {
    try {
      await deleteDoc(firestoreDoc(db, "stalls", req.params.id));
      res.json({ message: "Stall and license deleted safely." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin View overall transactions list
  app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "orders"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Admin overall platform statistics (Phase 3 & Phase 4)
  app.get("/api/admin/analytics", authenticateAdmin, async (req, res) => {
    try {
      const [uSnap, sSnap, oSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "stalls")),
        getDocs(collection(db, "orders")),
      ]);

      const users = uSnap.docs.map(d => d.data());
      const stalls = sSnap.docs.map(d => d.data());
      const orders = oSnap.docs.map(d => d.data());

      const activeUsersCount = users.filter(u => u.role === "customer").length;
      const totalVendorsCount = users.filter(u => u.role === "vendor").length;
      const approvedStallsCount = stalls.filter(s => s.isApproved).length;

      const totalRevenue = orders
        .filter(o => o.paymentStatus === "paid")
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

      // Group revenues by stall ID
      const stallReport: Record<string, number> = {};
      orders.forEach(o => {
        if (o.paymentStatus === "paid") {
          stallReport[o.stallId] = (stallReport[o.stallId] || 0) + (o.totalPrice || 0);
        }
      });

      // Construct category frequencies
      const catCount: Record<string, number> = {};
      stalls.forEach(s => {
        catCount[s.category] = (catCount[s.category] || 0) + 1;
      });

      res.json({
        activeUsersCount,
        totalVendorsCount,
        approvedStallsCount,
        totalRevenue,
        stallReport,
        categorySpread: Object.keys(catCount).map(k => ({ name: k, count: catCount[k] })),
        orderTrends: orders.map(o => ({ date: o.createdAt?.slice(5, 10), price: o.totalPrice }))
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });


  // --- WEB ROUTER & SPA STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(3000, "0.0.0.0", () => console.log(`Server running on port 3000`));
}

startServer();
