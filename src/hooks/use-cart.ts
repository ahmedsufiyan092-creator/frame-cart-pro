import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/cart.functions";
import { getGuestToken, getStoredCoupon, setStoredCoupon } from "@/lib/guest";
import type { PricedCart } from "@/lib/store.server";

export function useCart() {
  const fetchCart = useServerFn(getCart);
  const add = useServerFn(addToCart);
  const update = useServerFn(updateCartItem);
  const remove = useServerFn(removeCartItem);
  const clear = useServerFn(clearCart);
  const queryClient = useQueryClient();

  const query = useQuery<PricedCart>({
    queryKey: ["cart"],
    queryFn: () =>
      fetchCart({
        data: { guestToken: getGuestToken(), couponCode: getStoredCoupon() },
      }) as Promise<PricedCart>,
    staleTime: 5_000,
  });

  const invalidate = (data: PricedCart) => {
    queryClient.setQueryData(["cart"], data);
  };

  const addItem = useMutation({
    mutationFn: (input: {
      productId: string;
      sizeId: string;
      frameId: string;
      quantity: number;
    }) =>
      add({
        data: { ...input, guestToken: getGuestToken(), couponCode: getStoredCoupon() },
      }) as Promise<PricedCart>,
    onSuccess: (data) => {
      invalidate(data);
      toast.success("Added to your cart");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setQuantity = useMutation({
    mutationFn: (input: { cartItemId: string; quantity: number }) =>
      update({
        data: { ...input, guestToken: getGuestToken(), couponCode: getStoredCoupon() },
      }) as Promise<PricedCart>,
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeItem = useMutation({
    mutationFn: (cartItemId: string) =>
      remove({
        data: { cartItemId, guestToken: getGuestToken(), couponCode: getStoredCoupon() },
      }) as Promise<PricedCart>,
    onSuccess: (data) => {
      invalidate(data);
      toast("Removed from cart");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const emptyCart = useMutation({
    mutationFn: () => clear({ data: { guestToken: getGuestToken() } }) as Promise<PricedCart>,
    onSuccess: invalidate,
  });

  const applyCoupon = useMutation({
    mutationFn: async (code: string | null) => {
      setStoredCoupon(code ? code.toUpperCase() : null);
      return fetchCart({
        data: { guestToken: getGuestToken(), couponCode: code ? code.toUpperCase() : null },
      }) as Promise<PricedCart>;
    },
    onSuccess: (data) => {
      invalidate(data);
      if (data.couponCode) toast.success(data.couponMessage ?? "Coupon applied");
      else if (data.couponMessage) toast.error(data.couponMessage);
    },
  });

  return {
    cart: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    addItem,
    setQuantity,
    removeItem,
    emptyCart,
    applyCoupon,
  };
}
