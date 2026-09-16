import { prisma } from "../config/prisma.js";

const getOrCreateCart = async (userId) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, imageUrl: true, isActive: true, stock: true },
          },
        },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: { include: { product: true } } },
    });
  }
  return cart;
};

const formatCart = (cart) => {
  const items = cart.items.filter((i) => i.product.isActive);
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0);
  return { id: cart.id, items, subtotal: parseFloat(subtotal.toFixed(2)), itemCount: items.length };
};

export const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    res.json(formatCart(cart));
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ message: "productId is required" });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found or unavailable" });
    }
    if (product.stock < parseInt(quantity)) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user.id } });

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existing) {
      const newQty = existing.quantity + parseInt(quantity);
      if (product.stock < newQty) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity: parseInt(quantity) },
      });
    }

    const updatedCart = await getOrCreateCart(req.user.id);
    res.json(formatCart(updatedCart));
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) return res.status(400).json({ message: "quantity is required" });

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, cart: { userId: req.user.id } },
      include: { product: true },
    });
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    if (parseInt(quantity) <= 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      if (item.product.stock < parseInt(quantity)) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: parseInt(quantity) } });
    }

    const cart = await getOrCreateCart(req.user.id);
    res.json(formatCart(cart));
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, cart: { userId: req.user.id } },
    });
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    await prisma.cartItem.delete({ where: { id: item.id } });
    const cart = await getOrCreateCart(req.user.id);
    res.json(formatCart(cart));
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.json({ message: "Cart cleared", items: [], subtotal: 0, itemCount: 0 });
  } catch (error) {
    next(error);
  }
};
