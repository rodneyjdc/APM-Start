import { Component, ChangeDetectionStrategy } from '@angular/core';

import { EMPTY, Observable, catchError, map, Subject, combineLatest, startWith } from 'rxjs';
import { ProductCategory } from '../product-categories/product-category';

import { Product } from './product';
import { ProductService } from './product.service';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { SupplierService } from '../suppliers/supplier.service';

@Component({
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent {
  pageTitle = 'Product List';
  
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  // [Reacting to Actions] Step 1: create an action stream and expose by creating 
  //    a read-only observable of it
  private categorySelectedSubject = new Subject<number>();
  categorySelectedAction$ = this.categorySelectedSubject.asObservable();

  // [Reacting to Actions] Step 2: combine action stream (this.categorySelectedAction$)
  //    and data stream (this.productService.productsWithCategory$) to react to each
  //    emission from the action stream
  products$ = combineLatest([
        this.productService.productsWithAdd$,
        this.categorySelectedAction$
          .pipe(
            // initialize an emitted value of 0
            startWith(0)
          )
      ]).pipe(
        map(([products, selectedId]) => products.filter(p => 
          selectedId ? selectedId === p.categoryId : true
        )),
        catchError(err => {
          this.errorMessageSubject.next(err);
          return EMPTY;
        })
      );

  categories$ = this.categoryService.productCategories$
      .pipe(
        catchError(err => {
          this.errorMessageSubject.next(err);
          return EMPTY;
        })
      );

  constructor(private productService: ProductService, private categoryService: ProductCategoryService) { }

  onAdd(): void {
    this.productService.addProduct();
  }

  onSelected(categoryId: string): void {
    // [Reacting to Actions] Step 3: emit a value to the action stream when an action (user filters the products
    //    using the filter dropdown) occurs
    this.categorySelectedSubject.next(+categoryId);
  }
}
