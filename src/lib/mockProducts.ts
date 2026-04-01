export type Product = {
  id: string;
  title: string;
  handle: string;
  price: string;
  images: string[];
};

export const products: Product[] = [
  {
    id: "tee-black",
    title: "ROGU3 Tee — Black",
    handle: "rogu3-tee-black",
    price: "$55 CAD",
    images: [
      "/products/rogu3-tee-black-front.png",
      "/products/rogu3-tee-black-back.png",
    ],
  },
  {
    id: "skyline-shirt",
    title: "ROGU3 Skyline Shirt",
    handle: "rogu3-skyline-shirt",
    price: "$110 CAD",
    images: [
      "/products/rogu3-skyline-shirt-front.png",
      "/products/rogu3-skyline-shirt-back.png",
    ],
  },
  {
    id: "basketball-top",
    title: "ROGU3 Basketball Top",
    handle: "rogu3-basketball-top",
    price: "$85 CAD",
    images: [
      "/products/front_bball_rogu3.png",
      "/products/rear_bball_rogu3.png",
    ],
  },
  {
    id: "beanie",
    title: "ROGU3 Beanie — Brown",
    handle: "rogu3-beanie-brown",
    price: "$40 CAD",
    images: [
      "/products/rogu3-beanie-brown.png",
    ],
  },
  {
    id: "cap",
    title: "ROGU3 Cap — Brown",
    handle: "rogu3-cap-brown",
    price: "$45 CAD",
    images: [
      "/products/rogu3-cap-brown.png",
    ],
  },
];
