import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { catchError, Observable, tap, throwError, map, combineLatest, BehaviorSubject, Subject, merge, scan, shareReplay, filter, from, switchMap, forkJoin, of } from 'rxjs';

import { Product } from './product';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { SupplierService } from '../suppliers/supplier.service';
import { Supplier } from '../suppliers/supplier';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = 'api/suppliers';

  
  products$ = this.http.get<Product[]>(this.productsUrl)
                .pipe(
                  tap(data => console.log('Products: ', JSON.stringify(data))),
                  catchError(this.handleError)
                );

  // need to upsurge the prices by 50% and add product name as a searchKey
  // to map an http response, we'll need to:
  //    1. map (RxJS operator) the emitted array
  //    2. map (Array.map method) each element in the array
  //    3. transform each element buy modifying the field values of the element (which is an object)
  // cast to Product to maintain typing 
  //
  // products$ = this.http.get<Product[]>(this.productsUrl)
  //               .pipe(
  //                 map(products => products.map(
  //                   product => ({
  //                     ...product,
  //                     price: product.price ? product.price * 1.5: 0,
  //                     searchKey: [product.productName],
  //                   } as Product)
  //                 )),
  //                 tap(data => console.log('Products: ', JSON.stringify(data))),
  //                 catchError(this.handleError)
  //               );

  // combine two data streams (observables) with combine latest to map the categoryId to a category name
  // productCategories$ is a lookup stream because it maps the product.categoryId to category.id to get the 
  //    category name
  productsWithCategory$ = combineLatest([
    this.products$,
    this.productCategoriesService.productCategories$
  ]).pipe(
    map(([products, categories]) => products.map(
      product => ({
        ...product,
        price: product.price ? product.price * 1.5: 0,
        searchKey: [product.productName],
        category: categories.find(category => category.id == product.categoryId)?.name
      } as Product))
    ),
    shareReplay(1),
    catchError(this.handleError)
  );

  // Reacting to Actions, Step 1: create an action stream
  private productSelectedSubject = new BehaviorSubject<number>(0);
  productSelectedAction$ = this.productSelectedSubject.asObservable();

  // Reacting to Actions, step 2: combine the action stream and data stream to
  //    react to each emission from the action stream
  selectedProduct$ = combineLatest([
    this.productsWithCategory$,
    this.productSelectedAction$
  ]).pipe(
    // ([a, b] => {}) array destructuring
    map(([products, selectedProductId]) =>
      products.find(
        product => product.id === selectedProductId
      )
    ),
    tap(product => console.log(`Selected product: `, product)),
    shareReplay(1),
    catchError(this.handleError)
  )

  // reacting to an add operation (adding a new product)
  private productAddedSubject = new Subject<Product>();
  productAddedAction$ = this.productAddedSubject.asObservable();

  productsWithAdd$ = merge(
    this.productsWithCategory$,
    this.productAddedAction$
  ).pipe(
    scan((acc, value) => 
      (value instanceof Array) ? [...value] : [...acc, value], [] as Product[]
    )
  )
  
  // selectedProductSuppliers$ = combineLatest([
  //   this.selectedProduct$,
  //   this.supplierService.suppliers$
  // ]).pipe(
  //   map(([selectedProduct, suppliers]) => 
  //     suppliers.filter(supplier => selectedProduct?.supplierIds?.includes(supplier.id))
  //   )
  // )

  selectedProductSuppliers$ = this.selectedProduct$
  .pipe(
    filter(product => Boolean(product)),
    switchMap(selectedProduct => {
      if (selectedProduct?.supplierIds) {
        return forkJoin(selectedProduct.supplierIds.map(
          supplierId => this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)
        ));
      } else {
        return of([]);
      }
    }),
    tap(suppliers => console.log('product suppliers', JSON.stringify(suppliers)))
  )

  constructor(private http: HttpClient,
    private productCategoriesService: ProductCategoryService,
    private supplierService: SupplierService) { }


  addProduct(newProduct?: Product): void {
    newProduct = newProduct || this.fakeProduct();
    this.productAddedSubject.next(newProduct);
  }
  
  // Reacting to Actions, step 3: emit a value to the action stream
  //    when an action occurs
  selectedProductChanged(selectedProductId: number) {
    this.productSelectedSubject.next(selectedProductId);
  }

  private fakeProduct(): Product {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      category: 'Toolbox',
      quantityInStock: 30
    };
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.message}`;
    }
    console.error(err);
    return throwError(() => errorMessage);
  }

}
